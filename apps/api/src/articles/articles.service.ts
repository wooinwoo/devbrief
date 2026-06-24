import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** related 추천 기본 / 최대 개수 */
const RELATED_DEFAULT_LIMIT = 5;
const RELATED_MAX_LIMIT = 20;

/** related 카드 렌더에 필요한 필드 (article-card DTO 와 정렬) */
export interface RelatedArticle {
  id: string;
  title: string;
  titleKo: string | null;
  url: string;
  summaryOneLine: string | null;
  summaryThreeLine: string | null;
  publishedAt: Date;
  tags: string[];
  imageUrl: string | null;
  language: string;
  source: { name: string; provider: string };
}

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  /**
   * 기준 글의 embedding 으로 코사인 유사도(pgvector `<=>`) Top-K 관련 글을 찾는다.
   * - 자기 자신 제외, embedding 이 NULL 인 글 제외.
   * - 기준 글이 없거나 embedding 이 없으면 최신글로 폴백(자기 자신 제외).
   * chat.service 의 벡터 검증 패턴과 일관되게, 리터럴 주입 전 형태를 검증한다.
   */
  async findRelated(id: string, limit = RELATED_DEFAULT_LIMIT): Promise<RelatedArticle[]> {
    const take = Math.min(
      Math.max(Math.trunc(limit) || RELATED_DEFAULT_LIMIT, 1),
      RELATED_MAX_LIMIT,
    );

    // 기준 글의 embedding 을 raw 로 읽는다(Unsupported 타입이라 Prisma client 로는 못 읽음).
    const baseRows = await this.prisma.$queryRaw<{ embedding: string | null }[]>`
      SELECT a.embedding::text AS embedding
      FROM "Article" a
      WHERE a.id = ${id}
      LIMIT 1
    `;

    const base = baseRows[0];
    // 기준 글 없음 또는 embedding 없음 → 최신글 폴백.
    if (!base || base.embedding === null) {
      return this.latestFallback(id, take);
    }

    // pgvector 리터럴 검증 — chat.service 와 동일한 방어. `[n,n,...]` 형태만 허용.
    const literal = base.embedding;
    if (!/^\[[-0-9.,eE\s]+\]$/.test(literal)) {
      return this.latestFallback(id, take);
    }

    return this.prisma.$queryRawUnsafe<RelatedArticle[]>(
      `SELECT a.id, a.title, a."titleKo", a.url, a."summaryOneLine", a."summaryThreeLine",
              a."publishedAt", a.tags, a."imageUrl", a.language,
              json_build_object('name', s.name, 'provider', s.provider) AS source
       FROM "Article" a
       JOIN "Source" s ON a."sourceId" = s.id
       WHERE a.id <> $1
         AND a.embedding IS NOT NULL
       ORDER BY a.embedding <=> $2::vector
       LIMIT $3`,
      id,
      literal,
      take,
    );
  }

  /** embedding 이 없을 때 최신글로 채운다(자기 자신 제외). */
  private latestFallback(id: string, take: number): Promise<RelatedArticle[]> {
    return this.prisma.$queryRawUnsafe<RelatedArticle[]>(
      `SELECT a.id, a.title, a."titleKo", a.url, a."summaryOneLine", a."summaryThreeLine",
              a."publishedAt", a.tags, a."imageUrl", a.language,
              json_build_object('name', s.name, 'provider', s.provider) AS source
       FROM "Article" a
       JOIN "Source" s ON a."sourceId" = s.id
       WHERE a.id <> $1
       ORDER BY a."publishedAt" DESC
       LIMIT $2`,
      id,
      take,
    );
  }
}
