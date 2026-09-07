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
    return this.embedValidated(text, 'RETRIEVAL_DOCUMENT');
  }

  embedQuery(text: string): Promise<number[]> {
    return this.embedValidated(text, 'RETRIEVAL_QUERY');
  }

  private async embedValidated(
    text: string,
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  ): Promise<number[]> {
    const vector = await this.gemini.embed(text, taskType);
    if (
      !Array.isArray(vector) ||
      vector.length !== EmbeddingService.DIM ||
      !Array.from(vector).every((n) => typeof n === 'number' && Number.isFinite(n)) ||
      !vector.some((n) => n !== 0)
    ) {
      // 질의와 저장 모두 잘못된 벡터를 DB로 보내지 않는다. 검색 실패를 빈 결과로 숨기지 않는다.
      throw new Error('임베딩 벡터 형식 오류');
    }
    return vector;
  }

  async storeArticleEmbedding(articleId: string, title: string, snippet: string): Promise<void> {
    // 키 미설정은 영구 상황 — 재시도해도 결과가 같으므로 조용히 skip 유지.
    if (!this.gemini.isAvailable()) {
      this.logger.debug(`[${articleId}] embed skip (Gemini 미설정)`);
      return;
    }
    // 임베딩은 무료 대안이 없다(의미검색 전용). 일시 오류(429/5xx/타임아웃)를
    // 조용히 삼키면 embedding NULL 로 영구 고착되므로 그대로 throw —
    // 잡이 실패 처리돼 BullMQ 지수 backoff 재시도(attempts 유계)를 탄다.
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
