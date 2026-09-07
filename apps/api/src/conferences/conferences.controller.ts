import { Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { kstDayStart } from '../common/kst';
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
  async list(
    @Query('upcoming') upcoming?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const requestedLimit = Number(limit);
    // ponytail: 공개 피드 규모에 맞춰 최대 1,000건. 초과 시 커서 페이지네이션으로 전환한다.
    const take =
      Number.isSafeInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 1000)
        : 50;
    const where: Record<string, unknown> = {
      status: status ?? 'ACTIVE',
    };
    if (upcoming === '1') {
      // startDate/endDate 는 UTC 자정(= 당일 09:00 KST)으로 저장되므로 now 와 직접 비교하면
      // 행사 당일 09:00 KST 부터 목록에서 사라진다. KST 오늘 자정을 하한으로 삼아
      // 당일 행사는 KST 자정까지 유지하고, 멀티데이 행사는 endDate 로 마지막 날까지 포함.
      const dayStart = kstDayStart();
      where.OR = [{ startDate: { gte: dayStart } }, { endDate: { gte: dayStart } }];
    }

    return this.prisma.conference.findMany({
      where,
      orderBy: { startDate: 'asc' },
      take,
    });
  }

  /** og:image 자동 등록 (수동 트리거). force=1 → 기존 값도 재갱신. */
  @Post('sync-images')
  @UseGuards(AdminGuard)
  async syncImages(@Query('force') force?: string) {
    return this.imageSync.syncAll({ force: force === '1' });
  }

  /** 공개 일정 피드와 최근 기사에서 컨퍼런스·해커톤 후보를 수집한다. */
  @Post('discover')
  @UseGuards(AdminGuard)
  async discover(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.discovery.discover({
      days: days ? Number(days) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** 후보를 ACTIVE로 승인. 승인 후 image sync 자동 트리거. */
  @Post(':id/approve')
  @UseGuards(AdminGuard)
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
  @UseGuards(AdminGuard)
  async reject(@Param('id') id: string) {
    const conf = await this.prisma.conference.findUnique({ where: { id } });
    if (!conf) throw new NotFoundException('Conference not found');

    return this.prisma.conference.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }
}
