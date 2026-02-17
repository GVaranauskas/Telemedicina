import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

import databaseConfig from './config/database.config';
import neo4jConfig from './config/neo4j.config';
import scyllaConfig from './config/scylla.config';
import redisConfig from './config/redis.config';
import llmConfig from './config/llm.config';

import { PrismaModule } from './database/prisma/prisma.module';
import { Neo4jModule } from './database/neo4j/neo4j.module';
import { ScyllaModule } from './database/scylla/scylla.module';
import { RedisModule } from './database/redis/redis.module';

import { AuthModule } from './modules/auth/auth.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { ConnectionModule } from './modules/connection/connection.module';
import { FeedModule } from './modules/feed/feed.module';
import { InstitutionModule } from './modules/institution/institution.module';
import { JobModule } from './modules/job/job.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AgenticSearchModule } from './modules/agentic-search/agentic-search.module';
import { PatientModule } from './modules/patient/patient.module';
import { WorkplaceModule } from './modules/workplace/workplace.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, neo4jConfig, scyllaConfig, redisConfig, llmConfig],
    }),

    // Event Emitter for cross-db sync
    EventEmitterModule.forRoot(),

    // Rate Limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Database modules
    PrismaModule,
    Neo4jModule,
    ScyllaModule,
    RedisModule,

    // Feature modules
    AuthModule,
    DoctorModule,
    ConnectionModule,
    FeedModule,
    InstitutionModule,
    JobModule,
    ChatModule,
    NotificationModule,
    AgenticSearchModule,
    PatientModule,
    WorkplaceModule,
    AvailabilityModule,
    AppointmentModule,
    EventsModule,
  ],
})
export class AppModule {}
