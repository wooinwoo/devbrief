'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArticleRow } from '../article-row';
import { FeaturedArticle } from '../featured-article';
import { SectionHeader } from '../section-header';
import { FilterSidebar, type FilterGroup } from '../filter-sidebar';
import { Pagination } from '../pagination';
import { SidebarWidgets } from '../sidebar-widgets';
import type { ArticleDto } from '../article-card';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { VideoDto } from '@/lib/mock-videos';
import { groupByTime } from '@/lib/group-articles';
import { sourceColor } from '@/lib/source-colors';


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
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [hideRead, setHideRead] = useState(false);

  const sourceOptions = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const a of articles) {
      const cur = map.get(a.source.provider);
      if (cur) cur.count += 1;
      else map.set(a.source.provider, { name: a.source.name, count: 1 });
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([value, { name, count }]) => ({
        value,
        label: name,
        count,
        color: sourceColor(value),
      }));
  }, [articles]);

  const categoryOptions = useMemo(() => {
    // 대소문자만 다른 태그(#AI/#ai, #WWDC/#wwdc)는 하나로 합친다.
    // value 는 lowercase 정규화 키, label 은 가장 많이 쓰인 원형 표기.
    const map = new Map<string, { count: number; forms: Map<string, number> }>();
    for (const a of articles)
      for (const t of a.tags) {
        const key = t.toLowerCase();
        const cur = map.get(key) ?? { count: 0, forms: new Map() };
        cur.count += 1;
        cur.forms.set(t, (cur.forms.get(t) ?? 0) + 1);
        map.set(key, cur);
      }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([value, { count, forms }]) => {
        const label = [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return { value, label: `#${label}`, count };
      });
  }, [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (source && a.source.provider !== source) return false;
      if (category && !a.tags.some((t) => t.toLowerCase() === category))
        return false;
      if (hideRead && readSet.has(a.id)) return false;
      if (q) {
        const hay =
          `${a.title} ${a.titleKo ?? ''} ${a.summaryOneLine ?? ''} ${a.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [articles, query, source, category, hideRead, readSet]);

  const isFiltering = !!query.trim() || !!source || !!category || hideRead;

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
    if (typeof window !== 'undefined')
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      onClick={() => setHideRead(!hideRead)}
      aria-pressed={hideRead}
      className="w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors"
      style={{
        background: hideRead ? 'var(--color-bg-sunken)' : 'transparent',
        color: hideRead ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
        fontWeight: hideRead ? 600 : 500,
      }}
    >
      {hideRead ? '✓ 본 글 숨김' : '본 글 숨기기'}
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
            <SidebarWidgets
              conferences={conferences}
              videos={videos}
              onNavigate={onNavigate}
            />
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
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onChange={goPage}
            />
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
                rowIndexBase +
                grouped
                  .slice(0, gi)
                  .reduce((s, g) => s + g.articles.length, 0);
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
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onChange={goPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
