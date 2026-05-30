import { Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConferenceImageSyncService } from './conference-image-sync.service';

@Controller('conferences')
export class ConferencesController {
  constructor(
    private prisma: PrismaService,
    private imageSync: ConferenceImageSyncService,
  ) {}

  @Get()
  async list(@Query('upcoming') upcoming?: string) {
    const where = upcoming === '1' ? { startDate: { gte: new Date() } } : {};
    return this.prisma.conference.findMany({
      where,
      orderBy: { startDate: 'asc' },
      take: 50,
    });
  }

  /** og:image 자동 등록 (수동 트리거). force=1 → 기존 값도 재갱신. */
  @Post('sync-images')
  async syncImages(@Query('force') force?: string) {
    return this.imageSync.syncAll({ force: force === '1' });
  }
}
