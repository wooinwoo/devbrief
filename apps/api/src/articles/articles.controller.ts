import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 한 번에 배치 조회할 수 있는 글 id 최대 개수 */
const BATCH_MAX_IDS = 100;

@Controller('articles')
export class ArticlesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('source') source?: string, @Query('limit') limitStr?: string) {
    const limit = Math.min(Number(limitStr) || 30, 100);
    return this.prisma.article.findMany({
      where: source ? { source: { provider: source } } : undefined,
      orderBy: { publishedAt: 'desc' },
      take: limit,
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
    const ids = (idsStr ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, BATCH_MAX_IDS);

    if (ids.length === 0) return [];

    return this.prisma.article.findMany({
      where: { id: { in: ids } },
      include: { source: true },
    });
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
