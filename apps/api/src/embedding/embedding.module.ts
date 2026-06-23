import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { EmbeddingProcessor } from './embedding.processor';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'embedding' }), GeminiModule],
  providers: [EmbeddingService, EmbeddingProcessor],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
