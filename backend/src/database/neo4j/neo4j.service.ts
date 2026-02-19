import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session, ManagedTransaction, Config } from 'neo4j-driver';

const DEFAULT_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 200;

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver | null = null;
  private database: string;
  private readonly logger = new Logger(Neo4jService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const uri = this.configService.get<string>('neo4j.uri') || 'bolt://localhost:7687';
    const user = this.configService.get<string>('neo4j.user') || 'neo4j';
    const password = this.configService.get<string>('neo4j.password') || 'password';
    this.database = this.configService.get<string>('neo4j.database') || 'neo4j';

    const driverConfig: Config = {
      maxConnectionPoolSize: this.configService.get<number>('neo4j.maxConnectionPoolSize') || 50,
      connectionAcquisitionTimeout: this.configService.get<number>('neo4j.connectionAcquisitionTimeout') || 30000,
      connectionTimeout: this.configService.get<number>('neo4j.connectionTimeout') || 5000,
      maxTransactionRetryTime: this.configService.get<number>('neo4j.maxTransactionRetryTime') || 15000,
      logging: {
        level: 'warn',
        logger: (level, message) => {
          if (level === 'error') this.logger.error(message);
          else if (level === 'warn') this.logger.warn(message);
          else this.logger.debug(message);
        },
      },
    };

    const encrypted = this.configService.get<boolean>('neo4j.encrypted');
    if (encrypted) {
      driverConfig.encrypted = 'ENCRYPTION_ON';
      driverConfig.trust = 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES';
    }

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), driverConfig);

    try {
      await this.driver.verifyConnectivity({ database: this.database });
      const serverInfo = await this.driver.getServerInfo();
      this.logger.log(
        `Neo4j connected: ${serverInfo.address} (v${serverInfo.protocolVersion})`,
      );
    } catch (error) {
      this.logger.error('Neo4j connection failed — app will retry on first query', error);
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.logger.log('Neo4j driver closed');
    }
  }

  /**
   * Health check — useful for readiness probes.
   */
  async isHealthy(): Promise<boolean> {
    if (!this.driver) return false;
    try {
      await this.driver.verifyConnectivity({ database: this.database });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a new session scoped to the configured database.
   * Callers MUST close the session in a finally block.
   */
  getSession(mode: 'READ' | 'WRITE' = 'WRITE'): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }
    return this.driver.session({
      database: this.database,
      defaultAccessMode: mode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE,
    });
  }

  /**
   * Execute a read query with automatic retry on transient failures.
   */
  async read<T>(
    cypher: string,
    params: Record<string, any> = {},
  ): Promise<T[]> {
    return this.executeWithRetry('READ', cypher, params);
  }

  /**
   * Execute a write query with automatic retry on transient failures.
   */
  async write<T>(
    cypher: string,
    params: Record<string, any> = {},
  ): Promise<T[]> {
    return this.executeWithRetry('WRITE', cypher, params);
  }

  /**
   * Execute multiple write statements in a single transaction.
   * All succeed or all fail — useful for sync operations.
   */
  async writeTransaction(
    operations: Array<{ cypher: string; params?: Record<string, any> }>,
  ): Promise<void> {
    const session = this.getSession('WRITE');
    try {
      await session.executeWrite(async (tx: ManagedTransaction) => {
        for (const op of operations) {
          await tx.run(op.cypher, op.params || {});
        }
      });
    } finally {
      await session.close();
    }
  }

  private async executeWithRetry<T>(
    mode: 'READ' | 'WRITE',
    cypher: string,
    params: Record<string, any>,
    attempt = 1,
  ): Promise<T[]> {
    const session = this.getSession(mode);
    try {
      const executor = mode === 'READ'
        ? session.executeRead.bind(session)
        : session.executeWrite.bind(session);

      const result = await executor(
        (tx: ManagedTransaction) => tx.run(cypher, params),
      );
      return result.records.map((record) => record.toObject() as T);
    } catch (error: any) {
      const isTransient = this.isTransientError(error);
      if (isTransient && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Neo4j transient error (attempt ${attempt}/${DEFAULT_RETRY_ATTEMPTS}), retrying in ${delay}ms: ${error.message}`,
        );
        await this.sleep(delay);
        return this.executeWithRetry<T>(mode, cypher, params, attempt + 1);
      }
      throw error;
    } finally {
      await session.close();
    }
  }

  private isTransientError(error: any): boolean {
    if (!error) return false;
    const code = error.code || '';
    return (
      code.includes('TransientError') ||
      code.includes('ServiceUnavailable') ||
      code.includes('SessionExpired') ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED'
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
