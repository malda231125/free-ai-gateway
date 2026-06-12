import { Module } from '@nestjs/common';
import { GenerateController } from './generate/generate.controller';
import { GenerateService } from './generate/generate.service';
import { ChatCompletionsService } from './generate/chat-completions.service';
import { ModelRouterService } from './generate/model-router.service';
import { RateLimiterService } from './generate/rate-limiter.service';

@Module({
  controllers: [GenerateController],
  providers: [GenerateService, ChatCompletionsService, ModelRouterService, RateLimiterService],
})
export class AppModule {}
