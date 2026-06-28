import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { registerQueues, whenRedis } from '../common/bullmq.config';
import { EmbeddingProcessor } from './embedding.processor';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [...registerQueues('embedding'), GeminiModule],
  // Redis 있을 때만 워커 로드
  providers: [EmbeddingService, ...whenRedis(EmbeddingProcessor)],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
