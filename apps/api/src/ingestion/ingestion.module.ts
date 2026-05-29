import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { IngestionProcessor } from './ingestion.processor';
import { IngestionCron } from './ingestion.cron';
import { SourceSeederService } from './source-seeder.service';
import { RssParserService } from './rss-parser.service';

@Module({
  imports: [
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
