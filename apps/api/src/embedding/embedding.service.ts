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

  async storeArticleEmbedding(
    articleId: string,
    title: string,
    snippet: string,
  ): Promise<void> {
    if (!this.gemini.isAvailable()) {
      this.logger.debug(`[${articleId}] embed skip (Gemini 미설정)`);
      return;
    }
    const content = `${title}\n\n${snippet}`.slice(0, 8000);
    const vector = await this.embedDocument(content);
    const literal = `[${vector.join(',')}]`;

    await this.prisma.$executeRawUnsafe(
      `UPDATE "Article" SET embedding = $1::vector WHERE id = $2`,
      literal,
      articleId,
    );
    this.logger.log(`Embedded ${articleId} (${vector.length} dim)`);
  }
}
