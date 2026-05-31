import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
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

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: { conference: { select: { name: true, brandColor: true } } },
    });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  @Post('sync')
  async sync() {
    return this.youtube.syncAllConferences();
  }
}
