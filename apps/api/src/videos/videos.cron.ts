import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { YouTubeSyncService } from './youtube-sync.service';

@Injectable()
export class VideosCron {
  private readonly logger = new Logger(VideosCron.name);

  constructor(private youtube: YouTubeSyncService) {}

  // 매주 월요일 04:00 (Asia/Seoul) — 컨퍼런스 영상은 주 단위로 업로드되는 패턴이라 매일은 과함
  @Cron('0 4 * * 1', { timeZone: 'Asia/Seoul' })
  async weekly() {
    this.logger.log('Weekly YouTube sync triggered');
    try {
      const result = await this.youtube.syncAllConferences();
      this.logger.log(`YouTube sync done: synced=${result.synced}`);
    } catch (e) {
      this.logger.error(`YouTube sync failed: ${(e as Error).message}`);
    }
  }
}
