import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Gemini text-embedding-004 — 768 차원.
 * pgvector 컬럼 Article.embedding 도 vector(768).
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  static readonly DIM = GeminiService.EMBED_DIM;

  constructor(
    private gemini: GeminiService,
    private prisma: PrismaService,
  ) {}

  embedDocument(text: string): Promise<number[]> {
    return this.gemini.embed(text, 'RETRIEVAL_DOCUMENT');
  }

  embedQuery(text: string): Promise<number[]> {
    return this.gemini.embed(text, 'RETRIEVAL_QUERY');
  }

  async storeArticleEmbedding(articleId: string, title: string, snippet: string): Promise<void> {
    if (!this.gemini.isAvailable()) {
      this.logger.debug(`[${articleId}] embed skip (Gemini 미설정)`);
      return;
    }
    // 임베딩은 무료 대안이 없다(의미검색 전용). 키 만료/한도 시 재시도 폭주를
    // 막기 위해 조용히 skip — 검색은 키 복구 시 reanalyze로 채운다.
    let vector: number[];
    try {
      const content = `${title}\n\n${snippet}`.slice(0, 8000);
      vector = await this.embedDocument(content);
    } catch (e) {
      this.logger.debug(`[${articleId}] embed skip (실패): ${(e as Error).message.slice(0, 80)}`);
      return;
    }
    const literal = `[${vector.join(',')}]`;

    await this.prisma.$executeRawUnsafe(
      `UPDATE "Article" SET embedding = $1::vector WHERE id = $2`,
      literal,
      articleId,
    );
    this.logger.log(`Embedded ${articleId} (${vector.length} dim)`);
  }
}
