import { Module } from '@nestjs/common';
import { GraphInsightsController } from './graph-insights.controller';

@Module({
  controllers: [GraphInsightsController],
})
export class GraphInsightsModule {}
