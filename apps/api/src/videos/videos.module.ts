import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { disabledQueueProviders, registerQueues, whenRedis } from '../common/bullmq.config';
import { PrismaModule } from '../prisma/prisma.module';
import { VideoAnalysisProcessor } from './video-analysis.processor';
import { VideoAnalyzerService } from './video-analyzer.service';
import { VideosController } from './videos.controller';
import { VideosCron } from './videos.cron';
import { YouTubeSyncService } from './youtube-sync.service';

@Module({
  imports: [PrismaModule, GeminiModule, ...registerQueues('video-analyze')],
  controllers: [VideosController],
  providers: [
    YouTubeSyncService,
    VideoAnalyzerService,
    // Redis 있을 때만: 워커 + Cron
    ...whenRedis(VideoAnalysisProcessor, VideosCron),
    // Redis 없을 때: 컨트롤러가 주입받는 큐 토큰을 비활성 스텁으로 대체
    ...disabledQueueProviders('video-analyze'),
  ],
  exports: [VideoAnalyzerService],
})
export class VideosModule {}
