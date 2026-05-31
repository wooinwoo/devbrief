import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

const SYSTEM_PROMPT = `당신은 한국 개발자를 위한 기술 큐레이션 에디터입니다.
주어진 글 (제목 + 본문 일부) 을 분석해 JSON 으로만 응답합니다.

규칙:
- 모든 결과는 한국어. 영어 키워드 (예: React, RSC, LLM, OAuth) 는 그대로 둠.
- 영문 글이면 titleKo 에 자연스러운 한국어 제목 번역. 한국어 글이면 titleKo 는 null.
- summaryOneLine 은 한국어 한 줄 (40자 내외, 마침표 포함).
- summaryThreeLine 은 한국어 세 줄, 각 줄 70자 내외, \\n 로 구분.
- language 는 'ko' (한국어 글) | 'en' (영문 글) | 'mixed'.
- em dash 사용 금지 (쉼표, 마침표로 대체).
- 본문이 없거나 짧으면 제목 기반으로 추정.
- 클릭베이트 톤 금지. 정직하고 담백하게.

JSON 만 출력. 예시:
{
  "language": "en",
  "titleKo": "Vue의 KeepAlive를 React에서 컴파일하는 방법",
  "summaryOneLine": "VuReact 가 Vue 의 KeepAlive 동작을 React 컴포넌트로 트랜스파일하는 방식 설명.",
  "summaryThreeLine": "VuReact 는 Vue 코드를 React 로 변환하는 컴파일러다.\\nKeepAlive 같은 Vue 전용 lifecycle 을 어떻게 매핑하는지 구체 설명한다.\\n캐시 키 / activation 처리에 React.memo 와 useEffect 를 조합한다."
}`;

interface SummaryResult {
  language: 'ko' | 'en' | 'mixed';
  titleKo: string | null;
  summaryOneLine: string;
  summaryThreeLine: string;
}

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(
    private gemini: GeminiService,
    private prisma: PrismaService,
  ) {}

  async summarize(
    articleId: string,
    title: string,
    snippet: string,
  ): Promise<void> {
    if (!this.gemini.isAvailable()) {
      this.logger.debug(`[${articleId}] Gemini 미설정 — summarize skip`);
      return;
    }

    let parsed: SummaryResult;
    try {
      parsed = await this.gemini.generateJson<SummaryResult>({
        system: SYSTEM_PROMPT,
        prompt: `제목: ${title}\n\n본문 일부:\n${snippet || '(본문 없음)'}`,
        maxTokens: 700,
      });
    } catch (e) {
      this.logger.warn(`[${articleId}] summarize 실패: ${(e as Error).message}`);
      return;
    }

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        language: parsed.language ?? 'mixed',
        titleKo: parsed.language === 'ko' ? null : parsed.titleKo ?? null,
        summaryOneLine: parsed.summaryOneLine ?? null,
        summaryThreeLine: parsed.summaryThreeLine ?? null,
      },
    });
    this.logger.log(
      `[${articleId}] summarized lang=${parsed.language} ko=${!!parsed.titleKo}`,
    );
  }
}
