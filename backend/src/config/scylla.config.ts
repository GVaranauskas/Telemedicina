import { registerAs } from '@nestjs/config';

export default registerAs('scylla', () => ({
  contactPoints: (process.env.SCYLLA_CONTACT_POINTS || 'localhost:9042').split(','),
  localDataCenter: process.env.SCYLLA_LOCAL_DATA_CENTER || 'datacenter1',
  keyspace: process.env.SCYLLA_KEYSPACE || 'medconnect',
}));
