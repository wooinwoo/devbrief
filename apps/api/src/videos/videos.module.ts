import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VideosController } from './videos.controller';
import { YouTubeSyncService } from './youtube-sync.service';

@Module({
  imports: [PrismaModule],
  controllers: [VideosController],
  providers: [YouTubeSyncService],
})
export class VideosModule {}
