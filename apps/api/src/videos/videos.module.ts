import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VideoAnalysisProcessor } from './video-analysis.processor';
import { VideoAnalyzerService } from './video-analyzer.service';
import { VideosController } from './videos.controller';
import { VideosCron } from './videos.cron';
import { YouTubeSyncService } from './youtube-sync.service';

@Module({
  imports: [PrismaModule, GeminiModule, BullModule.registerQueue({ name: 'video-analyze' })],
  controllers: [VideosController],
  providers: [YouTubeSyncService, VideosCron, VideoAnalyzerService, VideoAnalysisProcessor],
  exports: [VideoAnalyzerService],
})
export class VideosModule {}
