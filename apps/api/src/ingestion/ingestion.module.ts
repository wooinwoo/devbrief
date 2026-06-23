import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { IngestionController } from './ingestion.controller';
import { IngestionCron } from './ingestion.cron';
import { IngestionProcessor } from './ingestion.processor';
import { IngestionService } from './ingestion.service';
import { RssParserService } from './rss-parser.service';
import { SourceSeederService } from './source-seeder.service';

@Module({
  imports: [
    CommonModule,
    BullModule.registerQueue(
      { name: 'ingestion' },
      { name: 'summarization' },
      { name: 'embedding' },
    ),
  ],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    IngestionProcessor,
    IngestionCron,
    SourceSeederService,
    RssParserService,
  ],
})
export class IngestionModule {}
