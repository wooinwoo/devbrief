import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArticlesService } from './articles.service';

/** 한 번에 배치 조회할 수 있는 글 id 최대 개수 */
const BATCH_MAX_IDS = 100;

@Controller('articles')
export class ArticlesController {
  constructor(
    private prisma: PrismaService,
    private articles: ArticlesService,
  ) {}

  @Get()
  async list(@Query('source') source?: string, @Query('limit') limitStr?: string) {
    const limit = Math.min(Number(limitStr) || 30, 100);
    return this.prisma.article.findMany({
      where: source ? { source: { provider: source } } : undefined,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      // contentHtml(원문 전문)은 피드 페이로드 비대화 방지로 목록에서 제외 — 상세에서만 내려준다.
      omit: { contentHtml: true },
      include: { source: { select: { name: true, provider: true } } },
    });
  }

  /**
   * 여러 글을 한 번에 조회 (북마크 모아보기 등 N+1 회피용).
   * `?ids=a,b,c` 형태. 단건 `GET /articles/:id` 와 라우트가 겹치지 않도록
   * `:id` 보다 먼저 선언한 고정 경로(`/articles/batch`)를 사용한다.
   * 찾은 글만 반환하며(요청 순서 비보장), 프론트가 정렬한다.
   */
  @Get('batch')
  async batch(@Query('ids') idsStr?: string) {
    // 중복 id 를 먼저 제거한 뒤 상한을 적용한다(상한이 고유 id 기준이 되도록).
    const parsed = (idsStr ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const ids = [...new Set(parsed)].slice(0, BATCH_MAX_IDS);

    if (ids.length === 0) return [];

    return this.prisma.article.findMany({
      where: { id: { in: ids } },
      omit: { contentHtml: true },
      include: { source: true },
    });
  }

  /**
   * 비슷한 글 추천. 기준 글의 embedding 으로 코사인 유사도(pgvector) Top-K.
   * 읽기 전용 GET 이라 어드민 가드 불필요. `:id` 단건 라우트보다 먼저 선언해
   * `/related` 가 단건 라우트에 흡수되지 않게 한다.
   */
  @Get(':id/related')
  async related(@Param('id') id: string, @Query('limit') limitStr?: string) {
    const limit = Number(limitStr);
    return this.articles.findRelated(id, Number.isFinite(limit) ? limit : undefined);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { source: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }
}
