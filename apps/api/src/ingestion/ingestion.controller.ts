import { Controller, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(
    private ingestion: IngestionService,
    @InjectQueue('ingestion') private queue: Queue,
  ) {}

  @Post('run')
  async runAsync() {
    await this.queue.add('ingest-all', {});
    return { status: 'queued' };
  }

  @Post('run-sync')
  async runSync() {
    return this.ingestion.ingestAll();
  }
}
