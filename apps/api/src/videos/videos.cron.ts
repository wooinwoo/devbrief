import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VideoAnalyzerService } from './video-analyzer.service';
import { YouTubeSyncService } from './youtube-sync.service';

@Injectable()
export class VideosCron {
  private readonly logger = new Logger(VideosCron.name);

  constructor(
    private youtube: YouTubeSyncService,
    private analyzer: VideoAnalyzerService,
  ) {}

  // 매주 월요일 04:00 (Asia/Seoul) — 컨퍼런스 영상은 주 단위로 업로드되는 패턴이라 매일은 과함
  @Cron('0 4 * * 1', { timeZone: 'Asia/Seoul' })
  async weekly() {
    this.logger.log('Weekly YouTube sync triggered');
    try {
      const result = await this.youtube.syncAllConferences();
      // sync 만 하면 새 영상의 chapters/summary 가 영구 NULL — 미분석 영상을 분석 큐에 적재
      // (어드민 POST /videos/sync 와 동일 정책을 enqueueUnanalyzed 로 공유)
      const queued = await this.analyzer.enqueueUnanalyzed();
      this.logger.log(`YouTube sync done: synced=${result.synced} queuedForAnalysis=${queued}`);
    } catch (e) {
      this.logger.error(`YouTube sync failed: ${(e as Error).message}`);
    }
  }
}
