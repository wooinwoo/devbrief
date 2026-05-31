import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SummarizationService } from './summarization.service';
import { SummarizationProcessor } from './summarization.processor';
import { GeminiModule } from '../ai/gemini.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'summarization' }),
    GeminiModule,
  ],
  providers: [SummarizationService, SummarizationProcessor],
})
export class SummarizationModule {}
