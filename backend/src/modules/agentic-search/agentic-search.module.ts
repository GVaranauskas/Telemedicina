import { Module } from '@nestjs/common';
import { AgenticSearchService } from './agentic-search.service';
import { AgenticSearchController } from './agentic-search.controller';
import { SearchAgent } from './agents/search.agent';
import { RecommendationAgent } from './agents/recommendation.agent';
import { CollaborationAgent } from './agents/collaboration.agent';
import { CareerAgent } from './agents/career.agent';
import { EventAgent } from './agents/event.agent';
import { LLMFactory } from './llm/llm.factory';
import { OpenAIAdapter } from './llm/openai.adapter';
import { ClaudeAdapter } from './llm/claude.adapter';
import { GeminiAdapter } from './llm/gemini.adapter';

@Module({
  controllers: [AgenticSearchController],
  providers: [
    AgenticSearchService,
    SearchAgent,
    RecommendationAgent,
    CollaborationAgent,
    CareerAgent,
    EventAgent,
    LLMFactory,
    OpenAIAdapter,
    ClaudeAdapter,
    GeminiAdapter,
  ],
  exports: [AgenticSearchService, CollaborationAgent, CareerAgent, EventAgent],
})
export class AgenticSearchModule {}
