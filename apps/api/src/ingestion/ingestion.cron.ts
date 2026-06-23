import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';

@Injectable()
export class IngestionCron {
  private readonly logger = new Logger(IngestionCron.name);

  constructor(@InjectQueue('ingestion') private queue: Queue) {}

  // 매일 오전 9시 (Asia/Seoul)
  @Cron('0 9 * * *', { timeZone: 'Asia/Seoul' })
  async daily() {
    this.logger.log('Daily ingestion triggered');
    await this.queue.add('ingest-all', {});
  }
}
