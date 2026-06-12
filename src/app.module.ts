import { Module } from '@nestjs/common';
import { GenerateController } from './generate/generate.controller';
import { GenerateService } from './generate/generate.service';
import { RateLimiterService } from './generate/rate-limiter.service';

@Module({
  controllers: [GenerateController],
  providers: [GenerateService, RateLimiterService],
})
export class AppModule {}
