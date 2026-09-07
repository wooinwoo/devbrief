import type { Prisma } from '@devbrief/db';
import {
  type ArticleDetail,
  type ArticleListItem,
  BATCH_MAX_IDS,
  type Equals,
  type Expect,
  TOTAL_COUNT_HEADER,
  type Wire,
} from '@devbrief/shared';
import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ArticlesService } from './articles.service';

/**
 * 목록/배치 공용 select — 웹 ArticleDto(article-card.tsx)와 1:1 화이트리스트.
 * omit(블랙리스트) 방식은 스키마에 무거운 컬럼이 추가될 때마다 페이로드 누수가
 * 재발한다. contentSnippet(최대 800자)/contentHtml/author/fetchedAt 등 웹이 쓰지
 * 않는 필드는 내려보내지 않고, 본문은 상세(GET /articles/:id)에서만 제공한다.
 */
const LIST_SELECT = {
  id: true,
  title: true,
  titleKo: true,
  url: true,
  summaryOneLine: true,
  summaryThreeLine: true,
  publishedAt: true,
  tags: true,
  imageUrl: true,
  language: true,
  source: { select: { name: true, provider: true } },
} as const;

/**
 * 계약 브리지 — Prisma 결과(직렬화 전)를 @devbrief/shared 와이어 계약과 대조한다.
 * select 나 스키마가 shared 타입과 어긋나면 아래 두 줄에서 컴파일이 깨진다 (감사 c58).
 */
type ArticleListRow = Prisma.ArticleGetPayload<{ select: typeof LIST_SELECT }>;
type ArticleDetailRow = Prisma.ArticleGetPayload<{ include: { source: true } }>;
type _ListContract = Expect<Equals<Wire<ArticleListRow>, ArticleListItem>>;
type _DetailContract = Expect<Equals<Wire<ArticleDetailRow>, ArticleDetail>>;

@Controller('articles')
export class ArticlesController {
  constructor(
    private prisma: PrismaService,
    private articles: ArticlesService,
  ) {}

  /**
   * 목록. 본문은 하위호환을 위해 배열 그대로 두고, 전체 건수(동일 where 의 count)는
   * X-Total-Count 헤더로 내려 offset 페이지네이션을 지원한다 (감사 c62).
   */
  @Get()
  async list(
    @Res({ passthrough: true }) res: Response,
    @Query('source') source?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Query('q') query?: string,
  ) {
    const limit = Math.min(Number(limitStr) || 30, 100);
    // offset — NaN/음수/Infinity 는 전부 기본 0 으로 방어
    const parsedOffset = Math.trunc(Number(offsetStr));
    const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;
    const term = query?.trim().slice(0, 120);
    const where: Prisma.ArticleWhereInput | undefined =
      source || term
        ? {
            ...(source ? { source: { provider: source } } : {}),
            ...(term
              ? {
                  OR: [
                    { title: { contains: term, mode: 'insensitive' } },
                    { titleKo: { contains: term, mode: 'insensitive' } },
                    { summaryOneLine: { contains: term, mode: 'insensitive' } },
                  ],
                }
              : {}),
          }
        : undefined;

    const [rows, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: offset,
        take: limit,
        select: LIST_SELECT,
      }),
      this.prisma.article.count({ where }),
    ]);

    res.setHeader(TOTAL_COUNT_HEADER, String(total));
    return rows;
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
      // 목록과 동일 계약 — source 전체(include)를 내려보내던 것도 name/provider 로 좁힌다.
      select: LIST_SELECT,
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
