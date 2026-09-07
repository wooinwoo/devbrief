import type { Prisma } from '@devbrief/db';
import type { Equals, Expect, SourcePublic, Wire } from '@devbrief/shared';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RssDiscoveryService } from './rss-discovery.service';

/**
 * 비인증 공개 select — lastError(내부 에러 원문)는 노출하지 않는 화이트리스트.
 * @devbrief/shared 의 SourcePublic 과 1:1.
 */
const SOURCE_PUBLIC_SELECT = {
  id: true,
  provider: true,
  name: true,
  feedUrl: true,
  homepage: true,
  language: true,
  active: true,
  createdAt: true,
  lastFetchedAt: true,
} as const;

/**
 * 계약 브리지 — select 결과(직렬화 전)를 shared 와이어 계약과 대조한다.
 * select 나 스키마가 SourcePublic 과 어긋나면 아래 줄에서 컴파일이 깨진다 (감사 c58).
 */
type SourcePublicRow = Prisma.SourceGetPayload<{
  select: typeof SOURCE_PUBLIC_SELECT;
}>;
type _SourcePublicContract = Expect<Equals<Wire<SourcePublicRow>, SourcePublic>>;

@Controller('sources')
export class SourcesController {
  constructor(
    private prisma: PrismaService,
    private discovery: RssDiscoveryService,
  ) {}

  @Get()
  async list() {
    // 비인증 공개 엔드포인트 — lastError(내부 에러 원문)는 노출하지 않는다
    return this.prisma.source.findMany({
      select: SOURCE_PUBLIC_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** URL 입력 → 피드 자동 발견 (저장 X, 미리보기) */
  @Post('discover')
  @UseGuards(AdminGuard)
  async discover(@Body() body: { url?: string }) {
    if (!body.url) throw new BadRequestException('url 필수');
    return { feeds: await this.discovery.discover(body.url) };
  }

  /** URL 입력 → 발견된 피드 모두 자동 등록 */
  @Post('discover-and-register')
  @UseGuards(AdminGuard)
  async register(@Body() body: { url?: string }) {
    if (!body.url) throw new BadRequestException('url 필수');
    return this.discovery.discoverAndRegister(body.url);
  }

  @Patch(':id/toggle')
  @UseGuards(AdminGuard)
  async toggle(@Param('id') id: string) {
    const src = await this.prisma.source.findUnique({ where: { id } });
    if (!src) throw new BadRequestException('Source not found');
    return this.prisma.source.update({
      where: { id },
      data: { active: !src.active },
    });
  }

  /**
   * 소스 삭제. Article.sourceId FK 가 RESTRICT 라 글이 있는 소스는 그냥 지우면
   * P2003 → 500 이 났다. 글이 있으면 409 로 안내하고, `?force=1` 이면 트랜잭션으로
   * Article → Source 순서로 함께 삭제한다. (Conference.discoveredFromArticleId 는
   * SET NULL FK 라 글 삭제 시 자동으로 끊긴다.)
   */
  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string, @Query('force') force?: string) {
    const src = await this.prisma.source.findUnique({ where: { id } });
    if (!src) throw new NotFoundException('Source not found');

    const articleCount = await this.prisma.article.count({
      where: { sourceId: id },
    });

    if (articleCount > 0 && force !== '1') {
      throw new ConflictException(
        `수집된 글이 ${articleCount}건 있는 소스라 삭제할 수 없습니다. 글까지 함께 지우려면 ?force=1 을 사용하고, 소스만 멈추려면 비활성화(toggle)를 사용하세요.`,
      );
    }

    if (articleCount > 0) {
      await this.prisma.$transaction([
        this.prisma.article.deleteMany({ where: { sourceId: id } }),
        this.prisma.source.delete({ where: { id } }),
      ]);
      return { ok: true, deletedArticles: articleCount };
    }

    await this.prisma.source.delete({ where: { id } });
    return { ok: true, deletedArticles: 0 };
  }
}
