'use client';

import { useMemo, useState } from 'react';
import { ArticleRow } from '../article-row';
import { FeaturedArticle } from '../featured-article';
import { SectionHeader } from '../section-header';
import { FilterSidebar, type FilterGroup } from '../filter-sidebar';
import type { ArticleDto } from '../article-card';
import { groupByTime } from '@/lib/group-articles';

const SOURCE_DOT: Record<string, string> = {
  geeknews: 'oklch(55% 0.16 160)',
  hackernews: 'oklch(62% 0.18 45)',
  devto: 'oklch(58% 0.18 290)',
  techcrunch: 'oklch(58% 0.21 15)',
  anthropic: 'oklch(62% 0.17 60)',
  kakao_tech: 'oklch(70% 0.16 90)',
  toss_tech: 'oklch(58% 0.18 250)',
  woowahan: 'oklch(64% 0.17 150)',
  naver_d2: 'oklch(58% 0.18 145)',
  rss_generic: 'oklch(58% 0.02 290)',
};

interface Props {
  articles: ArticleDto[];
  readSet: Set<string>;
  bookmarkSet?: Set<string>;
  onOpen: (id: string) => void;
  onBookmark?: (id: string) => void;
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
        color: SOURCE_DOT[value] ?? SOURCE_DOT.rss_generic,
      }));
  }, [articles]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles)
      for (const t of a.tags) map.set(t, (map.get(t) ?? 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, label: `#${value}`, count }));
  }, [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (source && a.source.provider !== source) return false;
      if (category && !a.tags.includes(category)) return false;
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
  const [featured, ...rest] = filtered;
  const grouped = useMemo(() => groupByTime(rest), [rest]);

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
      />

      <div className="flex-1 min-w-0">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            조건에 맞는 글이 없어요.
          </p>
        ) : isFiltering ? (
          <>
            <SectionHeader label="검색 결과" count={filtered.length} hint="matched" />
            <ul>
              {filtered.map((a, i) => (
                <ArticleRow
                  key={a.id}
                  article={a}
                  read={readSet.has(a.id)}
                  bookmarked={bookmarkSet?.has(a.id)}
                  onOpen={() => onOpen(a.id)}
                  onTagClick={setCategory}
                  onBookmark={onBookmark}
                  index={i}
                />
              ))}
            </ul>
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
              const base = grouped
                .slice(0, gi)
                .reduce((s, g) => s + g.articles.length, 0);
              return (
                <section key={group.label} className="mb-8">
                  <SectionHeader
                    label={group.label}
                    count={group.articles.length}
                    hint={SECTION_HINT[group.label] ?? 'today'}
                  />
                  <ul>
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
          </>
        )}
      </div>
    </div>
  );
}
