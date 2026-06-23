import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SummarizationService } from './summarization.service';
import { SummarizationProcessor } from './summarization.processor';
import { ArticleFetchService } from './article-fetch.service';
import { GeminiModule } from '../ai/gemini.module';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'summarization' }),
    GeminiModule,
    TranslationModule,
  ],
  providers: [
    SummarizationService,
    SummarizationProcessor,
    ArticleFetchService,
  ],
})
export class SummarizationModule {}
