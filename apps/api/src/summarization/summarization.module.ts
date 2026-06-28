import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { registerQueues, whenRedis } from '../common/bullmq.config';
import { TranslationModule } from '../translation/translation.module';
import { ArticleFetchService } from './article-fetch.service';
import { SummarizationProcessor } from './summarization.processor';
import { SummarizationService } from './summarization.service';

@Module({
  imports: [
    ...registerQueues('summarization'),
    GeminiModule,
    TranslationModule,
  ],
  providers: [
    SummarizationService,
    ArticleFetchService,
    // Redis 있을 때만 워커 로드
    ...whenRedis(SummarizationProcessor),
  ],
})
export class SummarizationModule {}
