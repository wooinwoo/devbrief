import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArticleDto } from '../article-card';

// next/navigation 모킹 — 필터는 URL 쿼리에서 파생되므로 searchParams 와 replace 를 제어한다.
const replace = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

import { ArticlesTab } from './articles-tab';

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  replace.mockClear();
  window.history.replaceState(null, '', '/');
  currentSearch = '';
  window.scrollTo = vi.fn();
});

describe('unread 필터 중 읽음 발생 시 페이지 고정', () => {
  // 41건 → unread=1 에서 3페이지(마지막 1건). 읽음이 생겨도 페이지가 튕기지 않아야 한다.
  const many = Array.from({ length: 41 }, (_, i) =>
    makeArticle({ id: `a${i + 1}`, title: `글 ${i + 1}` }),
  );

  it('글을 연 직후의 readSet 변화는 목록/페이지를 즉시 바꾸지 않고, 페이지 이동 시 반영된다', () => {
    currentSearch = 'tab=articles&unread=1';
    const onOpen = vi.fn();
    const { getByRole, getByText, queryByText, rerender } = render(
      <ArticlesTab articles={many} readSet={new Set()} onOpen={onOpen} />,
    );

    // localStorage 비동기 로드 시뮬레이션(글을 열기 전) — 스냅샷에 그대로 반영된다.
    rerender(<ArticlesTab articles={many} readSet={new Set()} onOpen={onOpen} />);

    // 3페이지(41번째 글만 있는 마지막 페이지)로 이동
    fireEvent.click(getByRole('button', { name: '3' }));
    expect(getByText('글 41')).toBeTruthy();

    // 글 열기(cmd+클릭으로 새 탭을 여는 상황 — 목록 화면은 그대로 남는다)
    fireEvent.click(getByText('글 41'));
    expect(onOpen).toHaveBeenCalledWith('a41');

    // 부모가 readSet 을 갱신해도 (수정 전엔 totalPages 3→2 로 줄며 2페이지로 튕겼다)
    rerender(<ArticlesTab articles={many} readSet={new Set(['a41'])} onOpen={onOpen} />);

    // 현재 페이지 내용이 유지된다 — 조작 없이 화면이 교체되지 않음.
    expect(getByText('글 41')).toBeTruthy();
    expect(queryByText('글 21')).toBeFalsy();

    // 페이지 이동(명시적 조작) 시에는 읽음이 반영되어 41번 글이 필터에서 빠진다.
    fireEvent.click(getByRole('button', { name: '2' }));
    expect(queryByText('글 41')).toBeFalsy();
    expect(getByText('글 40')).toBeTruthy();
  });
});

describe('사이드바 faceted 카운트', () => {
  // frontend 3건(devto) + ai 2건(anthropic)
  const mixed = [
    makeArticle({
      id: 'f1',
      title: 'React 19 출시',
      source: { name: 'Dev.to', provider: 'devto' },
    }),
    makeArticle({
      id: 'f2',
      title: 'Next.js 16 정식 릴리스',
      source: { name: 'Dev.to', provider: 'devto' },
    }),
    makeArticle({
      id: 'f3',
      title: 'CSS 그리드 심화',
      source: { name: 'Dev.to', provider: 'devto' },
    }),
    makeArticle({
      id: 'x1',
      title: 'Claude Opus 벤치마크',
      source: { name: 'Anthropic', provider: 'anthropic' },
    }),
    makeArticle({
      id: 'x2',
      title: 'GPT-5 공개',
      source: { name: 'Anthropic', provider: 'anthropic' },
    }),
  ];

  it('소스 필터 활성 시 카테고리 카운트는 교차 필터가 반영된 수치를 보여준다', () => {
    currentSearch = 'tab=articles&source=devto';
    const { getByRole } = render(
      <ArticlesTab articles={mixed} readSet={new Set()} onOpen={() => {}} />,
    );

    // devto 소스에는 frontend 3건뿐 — Frontend 버튼 카운트 3, AI 버튼은 0(목록엔 남음).
    expect(getByRole('button', { name: /Frontend/ }).textContent).toContain('3');
    expect(getByRole('button', { name: /^AI/ }).textContent).toContain('0');
  });

  it('카테고리 필터 활성 시 소스 카운트도 교차 필터 반영 — 버튼 숫자=클릭 후 결과 수', () => {
    currentSearch = 'tab=articles&cat=ai';
    const { getByRole } = render(
      <ArticlesTab articles={mixed} readSet={new Set()} onOpen={() => {}} />,
    );

    expect(getByRole('button', { name: /Anthropic/ }).textContent).toContain('2');
    expect(getByRole('button', { name: /Dev\.to/ }).textContent).toContain('0');
  });
});

describe('카테고리 필터 = 칩과 같은 진실', () => {
  it('태그 없는 글도 categoryOf 기반 카테고리 필터에 잡힌다', () => {
    currentSearch = 'tab=articles&cat=frontend';
    const articles = [
      makeArticle({ id: 'f1', title: 'React 19 출시' }), // tags=[] 여도 frontend
      makeArticle({ id: 'b1', title: 'Postgres 인덱스 튜닝' }),
    ];
    const { getByText, queryByText } = render(
      <ArticlesTab articles={articles} readSet={new Set()} onOpen={() => {}} />,
    );

    expect(getByText('React 19 출시')).toBeTruthy();
    expect(queryByText('Postgres 인덱스 튜닝')).toBeFalsy();
  });

  it('태그 클릭은 카테고리가 아닌 키워드 검색으로 흐른다(원시 태그는 6분류 키가 아님)', () => {
    currentSearch = 'tab=articles';
    // 첫 글은 featured 로 렌더되므로(태그 버튼 없음) 태그 있는 글을 두 번째 행으로 둔다.
    const articles = [
      makeArticle({ id: 't0', title: '머리기사' }),
      makeArticle({ id: 't1', title: 'Rust 1.80', tags: ['rust'] }),
    ];
    const { getByRole } = render(
      <ArticlesTab articles={articles} readSet={new Set()} onOpen={() => {}} />,
    );

    fireEvent.click(getByRole('button', { name: '#rust' }));

    expect(window.location.search).toBe('?tab=articles&q=rust');
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('더 불러오기 (c62)', () => {
  const articles = [makeArticle({ id: 'a1' })];

  it('loadMore 가 내려오면 버튼과 로드 현황 라벨을 그리고, 클릭 시 onLoadMore 를 부른다', () => {
    const onLoadMore = vi.fn();
    const { getByText } = render(
      <ArticlesTab
        articles={articles}
        readSet={new Set()}
        onOpen={() => {}}
        loadMore={{ total: 42, loading: false, onLoadMore }}
      />,
    );

    expect(getByText(/최근 1건 로드됨 · 전체 42건/)).toBeTruthy();
    fireEvent.click(getByText('이전 글 더 불러오기'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('loading 중에는 버튼을 비활성화하고 진행 문구를 보여준다', () => {
    const { getByText } = render(
      <ArticlesTab
        articles={articles}
        readSet={new Set()}
        onOpen={() => {}}
        loadMore={{ total: 42, loading: true, onLoadMore: () => {} }}
      />,
    );

    const btn = getByText('이전 글 불러오는 중').closest('button');
    expect(btn?.disabled).toBe(true);
  });

  it('loadMore 미지정(전부 로드/전체 미상)이면 버튼을 그리지 않는다', () => {
    const { queryByText } = render(
      <ArticlesTab articles={articles} readSet={new Set()} onOpen={() => {}} />,
    );
    expect(queryByText('이전 글 더 불러오기')).toBeNull();
  });
});

it('머리기사도 읽음 처리 없이 저장하고 저장 상태를 표시한다', () => {
  const onBookmark = vi.fn();
  const onOpen = vi.fn();
  const articles = [makeArticle({ id: 'feature', title: '오늘의 머리기사' })];
  const view = render(
    <ArticlesTab articles={articles} readSet={new Set()} onOpen={onOpen} onBookmark={onBookmark} />,
  );
  fireEvent.click(view.getByRole('button', { name: '저장' }));
  expect(onBookmark).toHaveBeenCalledWith('feature');
  expect(onOpen).not.toHaveBeenCalled();
  view.rerender(
    <ArticlesTab
      articles={articles}
      readSet={new Set()}
      bookmarkSet={new Set(['feature'])}
      onOpen={onOpen}
      onBookmark={onBookmark}
    />,
  );
  expect(view.getByRole('button', { name: '저장됨' }).getAttribute('aria-pressed')).toBe('true');
});
