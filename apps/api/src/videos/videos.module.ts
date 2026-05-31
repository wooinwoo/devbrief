import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { VideosController } from './videos.controller';
import { YouTubeSyncService } from './youtube-sync.service';
import { VideosCron } from './videos.cron';
import { VideoAnalyzerService } from './video-analyzer.service';
import { VideoAnalysisProcessor } from './video-analysis.processor';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'video-analyze' })],
  controllers: [VideosController],
  providers: [
    YouTubeSyncService,
    VideosCron,
    VideoAnalyzerService,
    VideoAnalysisProcessor,
  ],
  exports: [VideoAnalyzerService],
})
export class VideosModule {}
