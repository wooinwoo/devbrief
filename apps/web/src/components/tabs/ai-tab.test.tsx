import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArticleDto } from '../article-card';

// next/navigation 모킹 — AI 탭 필터도 URL 쿼리에서 파생된다.
const replace = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

import { AiTab } from './ai-tab';

function makeArticle(partial: Partial<ArticleDto> & { id: string }): ArticleDto {
  return {
    title: 'title',
    titleKo: null,
    url: 'https://x',
    summaryOneLine: null,
    summaryThreeLine: null,
    publishedAt: '2026-05-30T00:00:00Z',
    tags: [],
    imageUrl: null,
    language: 'ko',
    source: { name: 'GeekNews', provider: 'geeknews' },
    ...partial,
  };
}

const ARTICLES = [
  makeArticle({ id: 'c1', title: 'Claude Opus 4.5 출시' }),
  makeArticle({ id: 'g1', title: 'GPT-5 벤치마크 결과' }),
  makeArticle({ id: 'k1', title: 'ChatGPT로 업무 자동화하기' }),
  makeArticle({ id: 'k2', title: '인공지능 규제 법안 통과' }),
  makeArticle({ id: 'n1', title: '스타트업의 새로운 비즈니스 모델' }), // 비AI
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  replace.mockClear();
  currentSearch = 'tab=ai';
  window.scrollTo = vi.fn();
});

describe('AI 탭 멤버십 (isAiArticle 회귀)', () => {
  it('ChatGPT 복합어·인공지능 음차 글이 AI 탭에 노출된다', () => {
    const { getByText } = render(
      <AiTab articles={ARTICLES} readSet={new Set()} onOpen={() => {}} />,
    );
    expect(getByText('ChatGPT로 업무 자동화하기')).toBeTruthy();
    expect(getByText('인공지능 규제 법안 통과')).toBeTruthy();
  });

  it("'비즈니스 모델' 류 비AI 글은 AI 탭에 유입되지 않는다", () => {
    const { queryByText } = render(
      <AiTab articles={ARTICLES} readSet={new Set()} onOpen={() => {}} />,
    );
    expect(queryByText('스타트업의 새로운 비즈니스 모델')).toBeFalsy();
  });
});

describe('AI 탭 필터 URL 동기화', () => {
  it('URL 의 model 파라미터로 필터가 복원된다(새로고침/공유/뒤로가기)', () => {
    currentSearch = 'tab=ai&model=claude';
    const { getByText, queryByText } = render(
      <AiTab articles={ARTICLES} readSet={new Set()} onOpen={() => {}} />,
    );

    expect(getByText('필터된 소식')).toBeTruthy();
    expect(getByText('Claude Opus 4.5 출시')).toBeTruthy();
    expect(queryByText('GPT-5 벤치마크 결과')).toBeFalsy();
  });

  it('모델 버튼 클릭은 URL 쿼리를 갱신한다(tab 키 보존)', () => {
    const { getByRole } = render(
      <AiTab articles={ARTICLES} readSet={new Set()} onOpen={() => {}} />,
    );

    fireEvent.click(getByRole('button', { name: /Claude/ }));

    expect(replace).toHaveBeenCalledWith('/?tab=ai&model=claude', { scroll: false });
  });

  it('활성 필터 해제(전체 보기)는 키를 지운다', () => {
    currentSearch = 'tab=ai&model=claude';
    const { getByText } = render(
      <AiTab articles={ARTICLES} readSet={new Set()} onOpen={() => {}} />,
    );

    fireEvent.click(getByText('전체 보기'));

    expect(replace).toHaveBeenCalledWith('/?tab=ai', { scroll: false });
  });
});

describe('AI 탭 faceted 카운트', () => {
  it('모델 필터 활성 시 다른 그룹 카운트는 교차 필터가 반영된다', () => {
    currentSearch = 'tab=ai&model=claude';
    const { getByRole } = render(
      <AiTab articles={ARTICLES} readSet={new Set()} onOpen={() => {}} />,
    );

    // claude 필터 안에는 벤치마크 주제 글이 없다 — 목록엔 남되 카운트 0.
    expect(getByRole('button', { name: /벤치마크/ }).textContent).toContain('0');
    // 릴리스 주제(Claude Opus 4.5 "출시")는 1.
    expect(getByRole('button', { name: /모델 릴리스/ }).textContent).toContain('1');
  });
});
