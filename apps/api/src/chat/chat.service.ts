import { Injectable } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embedding/embedding.service';

interface RetrievedArticle {
  id: string;
  title: string;
  titleKo: string | null;
  url: string;
  summaryOneLine: string | null;
  publishedAt: Date;
  sourceName: string;
}

const SYSTEM_PROMPT = `당신은 한국 개발자 잭의 개인 기술 정보 비서 Devbrief 입니다.
주어진 컨텍스트 (수집된 글 목록) 위에서 자연스러운 한국어로 답합니다.

규칙:
- 답변에 출처를 [1] [2] 식으로 표기 (대괄호 + 숫자)
- 컨텍스트에 없는 내용은 추측하지 말 것
- em dash 금지 (쉼표 / 마침표로 대체)
- 짧고 명확하게. 5문장 이내 권장
- 카테고리별로 묶거나 핵심만 추리는 식으로 정리`;

@Injectable()
export class ChatService {
  constructor(
    private gemini: GeminiService,
    private prisma: PrismaService,
    private embedding: EmbeddingService,
  ) {}

  async retrieve(query: string, topK = 8): Promise<RetrievedArticle[]> {
    const queryVector = await this.embedding.embedQuery(query);
    const literal = `[${queryVector.join(',')}]`;

    return this.prisma.$queryRawUnsafe<RetrievedArticle[]>(
      `SELECT a.id, a.title, a."titleKo", a.url, a."summaryOneLine", a."publishedAt", s.name AS "sourceName"
       FROM "Article" a
       JOIN "Source" s ON a."sourceId" = s.id
       WHERE a.embedding IS NOT NULL
       ORDER BY a.embedding <=> $1::vector
       LIMIT $2`,
      literal,
      topK,
    );
  }

  async *chatStream(query: string): AsyncGenerator<string> {
    const articles = await this.retrieve(query);

    const contextText = articles.length
      ? articles
          .map((a, i) => {
            const date = new Date(a.publishedAt).toISOString().slice(0, 10);
            const displayTitle = a.titleKo ?? a.title;
            return `[${i + 1}] ${displayTitle} (출처: ${a.sourceName}, ${date})\n    요약: ${a.summaryOneLine ?? '(요약 없음)'}\n    URL: ${a.url}`;
          })
          .join('\n\n')
      : '(관련 글 없음)';

    yield* this.gemini.streamText({
      system: SYSTEM_PROMPT,
      prompt: `질문: ${query}\n\n참고 글 목록:\n\n${contextText}\n\n위 글들을 바탕으로 답변해주세요.`,
      maxTokens: 1000,
    });
  }
}
