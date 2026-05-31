import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmbeddingService } from './embedding.service';
import { EmbeddingProcessor } from './embedding.processor';
import { GeminiModule } from '../ai/gemini.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'embedding' }), GeminiModule],
  providers: [EmbeddingService, EmbeddingProcessor],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
