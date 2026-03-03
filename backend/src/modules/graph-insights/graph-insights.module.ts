import { Module } from '@nestjs/common';
import { GraphInsightsController } from './graph-insights.controller';
import { GraphInsightsService } from './graph-insights.service';

@Module({
  controllers: [GraphInsightsController],
  providers: [GraphInsightsService],
  exports: [GraphInsightsService],
})
export class GraphInsightsModule {}
