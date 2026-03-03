import { Module } from '@nestjs/common';
import { MedicalEventsController } from './medical-events.controller';
import { MedicalEventsService } from './medical-events.service';

@Module({
  controllers: [MedicalEventsController],
  providers: [MedicalEventsService],
  exports: [MedicalEventsService],
})
export class MedicalEventsModule {}
