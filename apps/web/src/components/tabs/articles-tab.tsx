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
import { useRouter, useSearchParams } from 'next/navigation';
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
}

const SECTION_HINT: Record<string, string> = {
  방금: 'just in',
  오늘: 'today',
  어제: 'yesterday',
  '이번 주': 'this week',
  '그 외': 'older',
};

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
}: Props) {
  // 검색/필터 상태는 URL 쿼리에서 파생 — 새로고침/뒤로가기/링크 공유 시 그대로 복원됨.
  // (탭 상태가 articles-view 에서 URL 로 관리되는 것과 동일한 패턴.)
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') ?? '';
  const source = searchParams.get('source') || null;
  const category = (searchParams.get('cat') || null)?.toLowerCase() ?? null;
  const hideRead = searchParams.get('unread') === '1';

  // 현재 쿼리스트링을 복제해 한 키만 갱신한 뒤 history 를 교체한다(tab 등 다른 키 보존).
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `/?${qs}` : '/', { scroll: false });
    },
    [searchParams, router],
  );

  // 키워드는 타이핑마다 URL 을 갈아끼우면 history 가 시끄러워지니 살짝 디바운스.
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (queryTimer.current) clearTimeout(queryTimer.current);
    },
    [],
  );
  const setQuery = useCallback(
    (v: string) => {
      if (queryTimer.current) clearTimeout(queryTimer.current);
      queryTimer.current = setTimeout(() => setParam('q', v.trim() || null), 250);
    },
    [setParam],
  );
  const setSource = useCallback((v: string | null) => setParam('source', v), [setParam]);
  const setCategory = useCallback((v: string | null) => setParam('cat', v), [setParam]);
  const toggleHideRead = useCallback(
    () => setParam('unread', hideRead ? null : '1'),
    [setParam, hideRead],
  );

  const sourceOptions = useMemo(() => sourceOptionsOf(articles), [articles]);
  const categoryOptions = useMemo(() => categoryOptionsOf(articles), [articles]);

  const filtered = useMemo(
    () => filterArticles(articles, { query, source, category, hideRead }, readSet),
    [articles, query, source, category, hideRead, readSet],
  );

  const isFiltering = isFilteringFn({ query, source, category, hideRead });

  // 페이지네이션. 필터 조건이 바뀌면 1페이지로 리셋.
  const PER_PAGE = 20;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [query, source, category, hideRead]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const pageSlice = filtered.slice(start, start + PER_PAGE);

  const goPage = (p: number) => {
    setPage(p);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 비필터 1페이지 최상단에만 머리기사(featured), 나머지는 시간대별 그룹.
  const showFeatured = !isFiltering && safePage === 1 && pageSlice.length > 0;
  const featured = showFeatured ? pageSlice[0] : null;
  const rows = showFeatured ? pageSlice.slice(1) : pageSlice;
  const rowIndexBase = showFeatured ? 1 : start;
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
      className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors"
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
            <SectionHeader label="검색 결과" count={filtered.length} hint="matched" />
            <ul className="grid xl:grid-cols-2 gap-x-10">
              {pageSlice.map((a, i) => (
                <ArticleRow
                  key={a.id}
                  article={a}
                  read={readSet.has(a.id)}
                  bookmarked={bookmarkSet?.has(a.id)}
                  onOpen={() => onOpen(a.id)}
                  onTagClick={setCategory}
                  onBookmark={onBookmark}
                  index={start + i}
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
                onOpen={() => onOpen(featured.id)}
              />
            )}
            {grouped.map((group, gi) => {
              const base =
                rowIndexBase + grouped.slice(0, gi).reduce((s, g) => s + g.articles.length, 0);
              return (
                <section key={group.label} className="mb-8">
                  <SectionHeader
                    label={group.label}
                    count={group.articles.length}
                    hint={SECTION_HINT[group.label] ?? 'today'}
                  />
                  <ul className="grid xl:grid-cols-2 gap-x-10">
                    {group.articles.map((a, i) => (
                      <ArticleRow
                        key={a.id}
                        article={a}
                        read={readSet.has(a.id)}
                        bookmarked={bookmarkSet?.has(a.id)}
                        onOpen={() => onOpen(a.id)}
                        onTagClick={setCategory}
                        onBookmark={onBookmark}
                        index={base + i}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
            <Pagination page={safePage} totalPages={totalPages} onChange={goPage} />
          </>
        )}
      </div>
    </div>
  );
}
