import { Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConferenceDiscoveryService } from './conference-discovery.service';
import { ConferenceImageSyncService } from './conference-image-sync.service';

@Controller('conferences')
export class ConferencesController {
  constructor(
    private prisma: PrismaService,
    private imageSync: ConferenceImageSyncService,
    private discovery: ConferenceDiscoveryService,
  ) {}

  /** ACTIVE만 기본 노출. ?status=PROPOSED 로 후보 확인. */
  @Get()
  async list(@Query('upcoming') upcoming?: string, @Query('status') status?: string) {
    const where: Record<string, unknown> = {
      status: status ?? 'ACTIVE',
    };
    if (upcoming === '1') where.startDate = { gte: new Date() };

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

  /** 자동 발견 실행 — RSS 글에서 Haiku NER로 컨퍼런스 추출. */
  @Post('discover')
  async discover(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.discovery.discoverFromRecentArticles({
      days: days ? Number(days) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** 후보를 ACTIVE로 승인. 승인 후 image sync 자동 트리거. */
  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    const conf = await this.prisma.conference.findUnique({ where: { id } });
    if (!conf) throw new NotFoundException('Conference not found');
    if (conf.status === 'ACTIVE') return conf;

    const updated = await this.prisma.conference.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    // 승인된 직후 image sync 백그라운드 트리거
    this.imageSync.syncAll().catch(() => {
      /* graceful */
    });
    return updated;
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    return this.prisma.conference.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }
}
