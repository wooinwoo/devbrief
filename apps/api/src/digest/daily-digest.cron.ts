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
    try {
      await this.digest.generateForToday();
    } catch (e) {
      // 다른 크론들과 동일 패턴 — 미처리 시 @nestjs/schedule 기본 로거(Scheduler)로 찍혀
      // digest 실패임을 식별하기 어렵다. 스택까지 남겨 원인 추적 가능하게.
      this.logger.error(`Digest cron failed: ${(e as Error).message}`, (e as Error).stack);
    }
  }
}
