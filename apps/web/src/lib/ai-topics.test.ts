import type { ArticleDto } from '@/components/article-card';
import { describe, expect, it } from 'vitest';
import { isAiArticle, modelsOf, themesOf } from './ai-topics';

// 테스트용 ArticleDto 팩토리 — 필요한 필드만 받고 나머지는 기본값.
function makeArticle(p: Partial<ArticleDto>): ArticleDto {
  return {
    id: p.id ?? 'id',
    title: p.title ?? '',
    titleKo: p.titleKo ?? null,
    url: p.url ?? 'https://example.com/post',
    summaryOneLine: p.summaryOneLine ?? null,
    summaryThreeLine: p.summaryThreeLine ?? null,
    publishedAt: p.publishedAt ?? '2026-01-01T00:00:00.000Z',
    tags: p.tags ?? [],
    imageUrl: p.imageUrl ?? null,
    language: p.language,
    source: p.source ?? { name: 'Test', provider: 'rss_generic' },
    contentHtml: p.contentHtml,
  };
}

const topTheme = (a: ArticleDto) => themesOf(a)[0]?.key;
const themeKeys = (a: ArticleDto) => themesOf(a).map((t) => t.key);
const modelKeys = (a: ArticleDto) => modelsOf(a).map((m) => m.key);

describe('themesOf — 우선순위 및 정규식 보강', () => {
  it('"DSpark: Speculative decoding [pdf]" → 연구·논문', () => {
    const a = makeArticle({ title: 'DSpark: Speculative decoding [pdf]' });
    expect(topTheme(a)).toBe('research');
  });

  it('"하이브리드 모델 토큰 예측 [HF]" (huggingface.co/papers 출처) → 연구·논문', () => {
    const a = makeArticle({
      title: '하이브리드 모델 토큰 예측 [HF]',
      url: 'https://huggingface.co/papers/2406.01234',
    });
    expect(topTheme(a)).toBe('research');
  });

  it('"오픈웨이트 vs 폐쇄형 LLM 격차 Artificial Analysis Index" → 벤치마크', () => {
    const a = makeArticle({
      title: '오픈웨이트 vs 폐쇄형 LLM 격차 Artificial Analysis Index',
    });
    expect(topTheme(a)).toBe('bench');
  });

  it('"Artificial Analysis Intelligence Index 추세분석" → 벤치마크', () => {
    const a = makeArticle({ title: 'Artificial Analysis Intelligence Index 추세분석' });
    expect(themeKeys(a)).toContain('bench');
  });

  it('pass@1 점수 글 → 벤치마크 포함', () => {
    const a = makeArticle({ title: '신규 LLM pass@1 점수 공개' });
    expect(themeKeys(a)).toContain('bench');
  });

  it('"AIRAG 채용 게시판"은 에이전트·하네스로 분류되지 않는다', () => {
    const a = makeArticle({
      title: 'AIRAG 채용 게시판',
      summaryOneLine: 'LLM·RAG 기반 AI 에이전트 플랫폼 채용 공고',
    });
    expect(themeKeys(a)).not.toContain('agent');
  });

  it('"OpenAI Codex 출력 토큰 56배 증가 보고"는 사내 지표라 주제 없음(그 외)', () => {
    const a = makeArticle({
      title: 'OpenAI Codex 출력 토큰 56배 증가 보고',
      summaryOneLine: '내부 사용량 통계를 공유한 보고',
    });
    expect(themesOf(a)).toHaveLength(0);
  });

  it('우선순위: 연구 > 릴리스 (논문 + 출시 동시 매칭이면 research)', () => {
    const a = makeArticle({ title: '새 추론 모델 출시, arxiv 논문 공개' });
    expect(topTheme(a)).toBe('research');
  });

  it('우선순위: 벤치 > 에이전트 (벤치마크 + 에이전트 동시 매칭이면 bench)', () => {
    const a = makeArticle({ title: '에이전트 benchmark 리더보드 평가' });
    expect(topTheme(a)).toBe('bench');
  });

  it('우선순위: 에이전트 > 릴리스 (에이전트 + 출시 동시 매칭이면 agent)', () => {
    const a = makeArticle({ title: '새 AI agent 출시' });
    expect(topTheme(a)).toBe('agent');
  });
});

describe('modelsOf — 제목 한정 매칭', () => {
  it('제목에 벤더명이 있으면 태그한다 ("Claude Opus 4.5 출시")', () => {
    const a = makeArticle({ title: 'Claude Opus 4.5 출시' });
    expect(modelKeys(a)).toContain('claude');
  });

  it('"아시아 AI 스타트업 Tulongfeng 출시" — 본문에만 Anthropic 언급 → claude 태그 아님', () => {
    const a = makeArticle({
      title: '아시아 AI 스타트업 Tulongfeng 출시',
      summaryOneLine: '중국 360의 신제품으로 Anthropic Claude와 경쟁 구도를 형성',
    });
    expect(modelKeys(a)).not.toContain('claude');
  });

  it('"신화 이후 사이버보안" — 본문 배경 언급뿐 → claude 태그 아님', () => {
    const a = makeArticle({
      title: '신화 이후 사이버보안',
      summaryOneLine: 'Anthropic 등장 이후 보안 지형 변화 분석',
    });
    expect(modelKeys(a)).not.toContain('claude');
  });

  it('"Akrites 공개서한" — 본문 배경 언급뿐 → claude 태그 아님', () => {
    const a = makeArticle({
      title: 'Akrites 공개서한',
      summaryOneLine: 'Anthropic을 향한 공개서한이 화제',
    });
    expect(modelKeys(a)).not.toContain('claude');
  });

  it('본문 언급으로도 isAiArticle 판정은 유지된다(노출은 됨)', () => {
    const a = makeArticle({
      title: '신화 이후 사이버보안',
      summaryOneLine: 'Anthropic 등장 이후 보안 지형 변화 분석',
    });
    expect(isAiArticle(a)).toBe(true);
  });
});
