import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DailyDigestService } from './daily-digest.service';

@Injectable()
export class DailyDigestCron {
  private readonly logger = new Logger(DailyDigestCron.name);

  constructor(private digest: DailyDigestService) {}

  // 매일 09:30 (Asia/Seoul) — 09:00 ingestion 30분 후
  @Cron('30 9 * * *', { timeZone: 'Asia/Seoul' })
  async daily() {
    this.logger.log('Daily digest 생성 시작');
    await this.digest.generateForToday();
  }
}
