import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { TranslationModule } from '../translation/translation.module';
import { ArticleFetchService } from './article-fetch.service';
import { SummarizationProcessor } from './summarization.processor';
import { SummarizationService } from './summarization.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'summarization' }), GeminiModule, TranslationModule],
  providers: [SummarizationService, SummarizationProcessor, ArticleFetchService],
})
export class SummarizationModule {}
