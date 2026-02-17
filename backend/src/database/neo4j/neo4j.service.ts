import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session, ManagedTransaction } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;
  private readonly logger = new Logger(Neo4jService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const uri = this.configService.get<string>('neo4j.uri') || 'bolt://localhost:7687';
    const user = this.configService.get<string>('neo4j.user') || 'neo4j';
    const password = this.configService.get<string>('neo4j.password') || 'password';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

    try {
      await this.driver.verifyConnectivity();
      this.logger.log('Neo4j connection established');
    } catch (error) {
      this.logger.error('Neo4j connection failed', error);
    }
  }

  async onModuleDestroy() {
    await this.driver.close();
  }

  getSession(): Session {
    return this.driver.session();
  }

  async read<T>(
    cypher: string,
    params: Record<string, any> = {},
  ): Promise<T[]> {
    const session = this.getSession();
    try {
      const result = await session.executeRead(
        (tx: ManagedTransaction) => tx.run(cypher, params),
      );
      return result.records.map((record) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  async write<T>(
    cypher: string,
    params: Record<string, any> = {},
  ): Promise<T[]> {
    const session = this.getSession();
    try {
      const result = await session.executeWrite(
        (tx: ManagedTransaction) => tx.run(cypher, params),
      );
      return result.records.map((record) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }
}
