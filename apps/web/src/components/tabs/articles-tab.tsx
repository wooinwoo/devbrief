'use client';

import {
  categoryOptionsOf,
  filterArticles,
  isFiltering as isFilteringFn,
  sourceOptionsOf,
} from '@/lib/filter-articles';
import { groupByTime } from '@/lib/group-articles';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { VideoDto } from '@/lib/mock-videos';
import { useUrlFilters } from '@/lib/use-url-filter';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArticleDto } from '../article-card';
import { ArticleRow } from '../article-row';
import { FeaturedArticle } from '../featured-article';
import { type FilterGroup, FilterSidebar } from '../filter-sidebar';
import { Pagination } from '../pagination';
import { SectionHeader } from '../section-header';
import { SidebarWidgets } from '../sidebar-widgets';

interface Props {
  articles: ArticleDto[];
  readSet: Set<string>;
  bookmarkSet?: Set<string>;
  onOpen: (id: string) => void;
  onBookmark?: (id: string) => void;
  emptyLabel?: string;
  conferences?: ConferenceDto[];
  videos?: VideoDto[];
  onNavigate?: (tab: 'conferences' | 'videos') => void;
  /**
   * c62 — 서버에 로드분(articles) 이후의 이전 글이 남았을 때만 내려온다.
   * total 은 X-Total-Count 의 전체 건수, onLoadMore 는 offset 페치 append.
   */
  loadMore?: { total: number; loading: boolean; onLoadMore: () => void };
}

export function ArticlesTab({
  articles,
  readSet,
  bookmarkSet,
  onOpen,
  onBookmark,
  emptyLabel = '조건에 맞는 글이 없어요.',
  conferences,
  videos,
  onNavigate,
  loadMore,
}: Props) {
  // 검색/필터 상태는 URL 쿼리에서 파생 — 새로고침/뒤로가기/링크 공유 시 그대로 복원됨.
  // (탭 상태가 articles-view 에서 URL 로 관리되는 것과 동일한 패턴.)
  const { searchParams, setParam, setParamDebounced } = useUrlFilters();
  const query = searchParams.get('q') ?? '';
  const source = searchParams.get('source') || null;
  const category = (searchParams.get('cat') || null)?.toLowerCase() ?? null;
  const hideRead = searchParams.get('unread') === '1';

  const setQuery = useCallback(
    (v: string) => setParamDebounced('q', v.trim() || null),
    [setParamDebounced],
  );
  const setSource = useCallback((v: string | null) => setParam('source', v), [setParam]);
  const setCategory = useCallback((v: string | null) => setParam('cat', v), [setParam]);
  const toggleHideRead = useCallback(
    () => setParam('unread', hideRead ? null : '1'),
    [setParam, hideRead],
  );
  // 태그 클릭은 키워드 검색으로 — 원시 태그는 categoryOf 6분류 키가 아니라서
  // 카테고리 필터에 넣으면 무조건 0건이 된다. matchesQuery 가 태그도 검색하므로 탐색은 유지됨.
  const searchByTag = useCallback((tag: string) => setParam('q', tag), [setParam]);

  // 본 글 숨김 필터에 쓰는 readSet 은 라이브 상태가 아닌 스냅샷 — 글을 읽는 순간
  // 목록이 재배열되거나 마지막 페이지가 통째로 사라져 페이지가 튕기는 것을 막는다.
  // 이 탭에서 글을 열기 전의 readSet 변화(localStorage 비동기 로드 등)는 그대로 반영하고,
  // 연 뒤의 변화(방금 읽음)는 명시적 조작(필터 변경·페이지 이동) 시점까지 유예한다.
  // 읽음 표시(ArticleRow read prop)는 계속 라이브 readSet 을 쓴다.
  const [filterReadSet, setFilterReadSet] = useState(readSet);
  const readSetRef = useRef(readSet);
  const openedHere = useRef(false);
  useEffect(() => {
    readSetRef.current = readSet;
    if (!openedHere.current) setFilterReadSet(readSet);
  }, [readSet]);
  const handleOpen = useCallback(
    (id: string) => {
      openedHere.current = true;
      onOpen(id);
    },
    [onOpen],
  );

  // 사이드바 옵션 '목록'은 전체 글 기준으로 고정(필터 상태에 따라 출렁이지 않게)하고,
  // 표시 '카운트'만 해당 그룹 조건을 뺀 나머지 필터를 적용한 부분집합 기준으로 다시 센다
  // (faceted count — 버튼 숫자와 클릭 후 결과 수가 일치). 활성 옵션은 0이어도 목록에 남는다.
  const sourceOptions = useMemo(() => {
    const counts = new Map(
      sourceOptionsOf(filterArticles(articles, { query, category, hideRead }, filterReadSet)).map(
        (o) => [o.value, o.count],
      ),
    );
    return sourceOptionsOf(articles).map((o) => ({ ...o, count: counts.get(o.value) ?? 0 }));
  }, [articles, query, category, hideRead, filterReadSet]);
  const categoryOptions = useMemo(() => {
    const counts = new Map(
      categoryOptionsOf(filterArticles(articles, { query, source, hideRead }, filterReadSet)).map(
        (o) => [o.value, o.count],
      ),
    );
    return categoryOptionsOf(articles).map((o) => ({ ...o, count: counts.get(o.value) ?? 0 }));
  }, [articles, query, source, hideRead, filterReadSet]);

  const filtered = useMemo(
    () => filterArticles(articles, { query, source, category, hideRead }, filterReadSet),
    [articles, query, source, category, hideRead, filterReadSet],
  );

  const isFiltering = isFilteringFn({ query, source, category, hideRead });

  // 페이지네이션. 필터 조건이 바뀌면 1페이지로 리셋(이때 읽음 스냅샷도 갱신).
  const PER_PAGE = 20;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
    setFilterReadSet(readSetRef.current);
  }, [query, source, category, hideRead]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const pageSlice = filtered.slice(start, start + PER_PAGE);

  const goPage = (p: number) => {
    setPage(p);
    // 페이지 이동은 명시적 조작 — 이 시점엔 그동안 읽은 글을 반영(스냅샷 갱신)한다.
    setFilterReadSet(readSetRef.current);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 비필터 1페이지 최상단에만 머리기사(featured), 나머지는 시간대별 그룹.
  const showFeatured = !isFiltering && safePage === 1 && pageSlice.length > 0;
  const featured = showFeatured ? pageSlice[0] : null;
  const rows = showFeatured ? pageSlice.slice(1) : pageSlice;
  const grouped = useMemo(() => groupByTime(rows), [rows]);

  const groups: FilterGroup[] = [
    {
      key: 'source',
      label: '소스',
      options: sourceOptions,
      active: source,
      onSelect: setSource,
    },
    {
      key: 'category',
      label: '카테고리',
      options: categoryOptions,
      active: category,
      onSelect: setCategory,
    },
  ];

  const hideReadToggle = (
    <button
      type="button"
      onClick={toggleHideRead}
      aria-pressed={hideRead}
      className="flex w-full min-h-11 items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors"
      style={{
        background: hideRead ? 'var(--color-bg-sunken)' : 'transparent',
        color: hideRead ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
        fontWeight: hideRead ? 600 : 500,
      }}
    >
      {hideRead && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M2.5 6.5L5 9L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span>{hideRead ? '본 글 숨김' : '본 글 숨기기'}</span>
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <FilterSidebar
        groups={groups}
        search={{ value: query, onChange: setQuery, placeholder: '글 검색' }}
        extra={hideReadToggle}
        footer={
          conferences && videos && onNavigate ? (
            <SidebarWidgets conferences={conferences} videos={videos} onNavigate={onNavigate} />
          ) : undefined
        }
      />

      <div className="flex-1 min-w-0">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            {emptyLabel}
          </p>
        ) : isFiltering ? (
          <>
            <SectionHeader label="검색 결과" count={filtered.length} />
            <ul className="grid xl:grid-cols-2 gap-x-10">
              {pageSlice.map((a) => (
                <ArticleRow
                  key={a.id}
                  article={a}
                  read={readSet.has(a.id)}
                  bookmarked={bookmarkSet?.has(a.id)}
                  onOpen={() => handleOpen(a.id)}
                  onTagClick={searchByTag}
                  onBookmark={onBookmark}
                />
              ))}
            </ul>
            <Pagination page={safePage} totalPages={totalPages} onChange={goPage} />
          </>
        ) : (
          <>
            {featured && (
              <FeaturedArticle
                article={featured}
                read={readSet.has(featured.id)}
                onOpen={() => handleOpen(featured.id)}
              />
            )}
            {grouped.map((group) => (
              <section key={group.label} className="mb-8">
                <SectionHeader label={group.label} count={group.articles.length} />
                <ul className="grid xl:grid-cols-2 gap-x-10">
                  {group.articles.map((a) => (
                    <ArticleRow
                      key={a.id}
                      article={a}
                      read={readSet.has(a.id)}
                      bookmarked={bookmarkSet?.has(a.id)}
                      onOpen={() => handleOpen(a.id)}
                      onTagClick={searchByTag}
                      onBookmark={onBookmark}
                    />
                  ))}
                </ul>
              </section>
            ))}
            <Pagination page={safePage} totalPages={totalPages} onChange={goPage} />
          </>
        )}

        {/* c62 — 서버에 이전 글이 더 남았으면 offset 페치로 이어 붙인다.
            appended 글은 목록/필터/페이지네이션 풀에 그대로 합류한다. */}
        {loadMore && (
          <div className="flex flex-col items-center gap-2.5 pt-6 pb-2">
            <button
              type="button"
              onClick={loadMore.onLoadMore}
              disabled={loadMore.loading}
              aria-busy={loadMore.loading}
              className="min-h-[44px] px-5 rounded-lg text-[13.5px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-(--color-bg-sunken)"
              style={{
                border: '1px solid var(--color-line-strong)',
                color: 'var(--color-fg-strong)',
                fontWeight: 600,
              }}
            >
              {loadMore.loading ? '이전 글 불러오는 중' : '이전 글 더 불러오기'}
            </button>
            <p className="text-[12px] tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
              최근 {articles.length}건 로드됨 · 전체 {loadMore.total}건
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
