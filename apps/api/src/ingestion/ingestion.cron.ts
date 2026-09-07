import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { kstDateLabel } from '../common/kst';

@Injectable()
export class IngestionCron {
  private readonly logger = new Logger(IngestionCron.name);

  constructor(@InjectQueue('ingestion') private queue: Queue) {}

  // 매일 오전 9시 (Asia/Seoul)
  @Cron('0 9 * * *', { timeZone: 'Asia/Seoul' })
  async daily() {
    this.logger.log('Daily ingestion triggered');
    // KST 날짜 기반 결정적 jobId — 다중 레플리카/재시작/중복 트리거 시 하루 1회로 dedupe.
    // (어드민 수동 트리거 POST /ingestion/run 은 jobId 없이 별도 적재라 영향 없음)
    await this.queue.add(
      'ingest-all',
      {},
      {
        jobId: `ingest-all:${kstDateLabel()}`,
        removeOnComplete: 30,
        removeOnFail: 30,
      },
    );
  }
}
