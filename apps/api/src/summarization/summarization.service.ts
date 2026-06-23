import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { ArticleFetchService } from './article-fetch.service';

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
    private translation: TranslationService,
    private fetcher: ArticleFetchService,
  ) {}

  async summarize(
    articleId: string,
    title: string,
    snippet: string,
  ): Promise<void> {
    // 1순위: Gemini(고품질). isAvailable()은 키 "존재"만 보므로, 키가
    // 만료/무효여도 true다 → 실제 호출이 실패하면 무료 경로로 폴백한다.
    if (this.gemini.isAvailable()) {
      try {
        const parsed = await this.gemini.generateJson<SummaryResult>({
          system: SYSTEM_PROMPT,
          prompt: `제목: ${title}\n\n본문 일부:\n${snippet || '(본문 없음)'}`,
          maxTokens: 700,
        });
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
          `[${articleId}] summarized(gemini) lang=${parsed.language} ko=${!!parsed.titleKo}`,
        );
        return;
      } catch (e) {
        // 키 만료/한도/기타 — 재시도로 막히지 말고 무료 경로로 내려간다.
        this.logger.warn(
          `[${articleId}] Gemini 실패 → 무료 폴백: ${(e as Error).message.slice(0, 100)}`,
        );
      }
    }

    // 2순위: 무료 경로 (LLM 없이 한국어화)
    await this.summarizeFree(articleId, title, snippet);
  }

  /**
   * 무료 경로: LLM 없이 한국어화 + 추출식(extractive) 요약.
   * - titleKo  : 무료 번역(Google 비공식 → MyMemory)
   * - 본문 확보: 전달받은 snippet → 저장된 contentSnippet → 원문 URL fetch 순.
   *   새로 fetch하면 contentSnippet에 캐시(다음 재처리 때 fetch 불필요).
   * - oneLine  : 본문 첫 문장. threeLine: 첫 3문장. 영문이면 통째 번역 후 재분할.
   *   (LLM 압축이 아니라 추출이지만, Gemini 없이도 한/세 줄을 채울 수 있다.)
   */
  private async summarizeFree(
    articleId: string,
    title: string,
    snippet: string,
  ): Promise<void> {
    const isKo = this.translation.hasKorean(title);
    const titleKo = isKo ? null : await this.translation.toKorean(title);

    // 1) 본문 확보
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { url: true, contentSnippet: true },
    });
    let body = cleanBody(snippet) || cleanBody(article?.contentSnippet ?? '');
    if (body.length < 60 && article?.url) {
      const fetched = await this.fetcher.fetchBody(article.url);
      if (fetched) {
        body = cleanBody(fetched);
        // 다음 재처리 때 다시 안 긁도록 캐시
        await this.prisma.article.update({
          where: { id: articleId },
          data: { contentSnippet: body.slice(0, 800) },
        });
      }
    }

    // 2) 본문에서 1~3문장 추출 → (영문이면) 번역 → 재분할
    let oneLine: string | null = null;
    let threeLine: string | null = null;
    const sentences = topSentences(body, 3);
    if (sentences.length) {
      const block = sentences.join(' ');
      const koBlock = this.translation.hasKorean(block)
        ? block
        : (await this.translation.toKorean(block)) ?? block;
      const koSentences = splitSentences(koBlock).slice(0, 3);
      if (koSentences.length) {
        oneLine = clamp(koSentences[0], 140);
        threeLine = koSentences.map((s) => clamp(s, 90)).join('\n');
      }
    }

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        language: isKo ? 'ko' : 'en',
        titleKo,
        summaryOneLine: oneLine,
        summaryThreeLine: threeLine,
      },
    });
    this.logger.log(
      `[${articleId}] summarized(free) ko=${!!titleKo} oneLine=${!!oneLine} threeLine=${!!threeLine}`,
    );
  }
}

/** HTML/엔티티/메타줄 제거 후 평문화. */
export function cleanBody(raw: string): string {
  return (raw ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/기사 URL:\s*\S+/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 평문에서 의미 있는 앞쪽 문장 n개 추출. */
export function topSentences(text: string, n: number): string[] {
  if (!text || text.length < 12) return [];
  return splitSentences(text)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12)
    .slice(0, n);
}

/** 마침표/물음표/느낌표/。 기준 문장 분리. */
export function splitSentences(text: string): string[] {
  return (text ?? '')
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 최대 길이 초과 시 말줄임. */
export function clamp(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max).trim() + '…' : t;
}
