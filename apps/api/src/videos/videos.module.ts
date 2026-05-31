import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VideosController } from './videos.controller';
import { YouTubeSyncService } from './youtube-sync.service';
import { VideosCron } from './videos.cron';

@Module({
  imports: [PrismaModule],
  controllers: [VideosController],
  providers: [YouTubeSyncService, VideosCron],
})
export class VideosModule {}
