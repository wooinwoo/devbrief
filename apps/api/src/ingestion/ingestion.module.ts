import { Module } from '@nestjs/common';
import { disabledQueueProviders, registerQueues, whenRedis } from '../common/bullmq.config';
import { CommonModule } from '../common/common.module';
import { IngestionController } from './ingestion.controller';
import { IngestionCron } from './ingestion.cron';
import { IngestionProcessor } from './ingestion.processor';
import { IngestionService } from './ingestion.service';
import { RssParserService } from './rss-parser.service';
import { SourceSeederService } from './source-seeder.service';

@Module({
  imports: [CommonModule, ...registerQueues('ingestion', 'summarization', 'embedding')],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    SourceSeederService,
    RssParserService,
    // Redis 있을 때만: 워커(Processor) + 큐에 enqueue 하는 Cron
    ...whenRedis(IngestionProcessor, IngestionCron),
    // Redis 없을 때: 주입받는 큐 토큰을 비활성 스텁으로 대체 (서비스/컨트롤러 부팅 가능)
    ...disabledQueueProviders('ingestion', 'summarization', 'embedding'),
  ],
})
export class IngestionModule {}
