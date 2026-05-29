import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmbeddingService } from './embedding.service';
import { EmbeddingProcessor } from './embedding.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'embedding' })],
  providers: [EmbeddingService, EmbeddingProcessor],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
