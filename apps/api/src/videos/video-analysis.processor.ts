import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VideoAnalyzerService } from './video-analyzer.service';

export interface VideoAnalyzeJobData {
  videoDbId: string;
  force?: boolean;
}

@Processor('video-analyze', { concurrency: 2 })
export class VideoAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoAnalysisProcessor.name);

  constructor(private analyzer: VideoAnalyzerService) {
    super();
  }

  async process(job: Job<VideoAnalyzeJobData>): Promise<void> {
    const { videoDbId, force } = job.data;
    try {
      const result = await this.analyzer.analyzeOne(videoDbId, { force });
      if (result.skipped) {
        this.logger.debug(`[${videoDbId}] skip (already analyzed)`);
        return;
      }
      this.logger.log(
        `[${videoDbId}] analyzed source=${result.chapterSource ?? 'none'} chapters=${result.chapters.length} summary=${result.summary ? 'y' : 'n'}`,
      );
    } catch (e) {
      this.logger.error(`[${videoDbId}] analyze 실패: ${(e as Error).message}`);
      throw e;
    }
  }
}
