import { Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeSyncService } from './youtube-sync.service';

@Controller('videos')
export class VideosController {
  constructor(
    private prisma: PrismaService,
    private youtube: YouTubeSyncService,
  ) {}

  @Get()
  async list(@Query('limit') limitStr?: string) {
    const limit = Math.min(Number(limitStr) || 20, 100);
    return this.prisma.video.findMany({
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { conference: { select: { name: true, brandColor: true } } },
    });
  }

  @Post('sync')
  async sync() {
    return this.youtube.syncAllConferences();
  }
}
