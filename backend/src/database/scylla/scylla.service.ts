import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, types, mapping } from 'cassandra-driver';

@Injectable()
export class ScyllaService implements OnModuleInit, OnModuleDestroy {
  private client: Client;
  private readonly logger = new Logger(ScyllaService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const contactPoints = this.configService.get<string[]>(
      'scylla.contactPoints',
    );
    const localDataCenter = this.configService.get<string>(
      'scylla.localDataCenter',
    );
    const keyspace = this.configService.get<string>('scylla.keyspace');

    this.client = new Client({
      contactPoints,
      localDataCenter,
      keyspace,
      protocolOptions: { port: 9042 },
    });

    try {
      await this.client.connect();
      this.logger.log('ScyllaDB connection established');
    } catch (error) {
      this.logger.warn(
        'ScyllaDB connection failed (will retry on first query)',
        error.message,
      );
    }
  }

  async onModuleDestroy() {
    await this.client.shutdown();
  }

  getClient(): Client {
    return this.client;
  }

  async execute(query: string, params?: any[], options?: any) {
    return this.client.execute(query, params, {
      prepare: true,
      ...options,
    });
  }

  async initKeyspace() {
    const keyspace = this.configService.get<string>('scylla.keyspace');
    const tempClient = new Client({
      contactPoints: this.configService.get<string[]>(
        'scylla.contactPoints',
      ),
      localDataCenter: this.configService.get<string>(
        'scylla.localDataCenter',
      ),
    });

    await tempClient.connect();
    await tempClient.execute(`
      CREATE KEYSPACE IF NOT EXISTS ${keyspace}
      WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 1
      }
    `);
    await tempClient.shutdown();
    this.logger.log(`Keyspace '${keyspace}' ensured`);
  }

  get timeUuid(): typeof types.TimeUuid {
    return types.TimeUuid;
  }

  get uuid(): typeof types.Uuid {
    return types.Uuid;
  }
}
