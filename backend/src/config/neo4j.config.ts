import { registerAs } from '@nestjs/config';

export default registerAs('neo4j', () => ({
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'medconnect_dev_2026',

  // Connection pool
  maxConnectionPoolSize: parseInt(process.env.NEO4J_MAX_POOL_SIZE || '50', 10),
  connectionAcquisitionTimeout: parseInt(process.env.NEO4J_ACQUISITION_TIMEOUT || '30000', 10),
  connectionTimeout: parseInt(process.env.NEO4J_CONNECTION_TIMEOUT || '5000', 10),
  maxTransactionRetryTime: parseInt(process.env.NEO4J_MAX_RETRY_TIME || '15000', 10),

  // TLS - enable in production
  encrypted: process.env.NEO4J_ENCRYPTED === 'true',

  // Database name (Neo4j 4+ supports multiple databases)
  database: process.env.NEO4J_DATABASE || 'neo4j',
}));
