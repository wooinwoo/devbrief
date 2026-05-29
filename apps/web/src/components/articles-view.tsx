'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { ArticleDto } from './article-card';
import { ArticleCard } from './article-card';
import { TopStoryCard } from './top-story-card';
import { HeroStrip } from './hero-strip';
import { ConferenceSection } from './conference-section';
import { PageFooter } from './page-footer';
import { readTracking } from '@/lib/read-tracking';
import { groupByTime, extractTopTags } from '@/lib/group-articles';
import { MOCK_CONFERENCES } from '@/lib/mock-conferences';

interface Props {
  articles: ArticleDto[];
}

export function ArticlesView({ articles }: Props) {
  const [query, setQuery] = useState('');
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [hideRead, setHideRead] = useState(false);

  useEffect(() => {
    setReadSet(readTracking.load());
  }, []);

  const sourceCounts = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const a of articles) {
      const cur = map.get(a.source.provider);
      if (cur) cur.count += 1;
      else map.set(a.source.provider, { name: a.source.name, count: 1 });
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [articles]);

  const topTags = useMemo(() => extractTopTags(articles, 8), [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (activeSource && a.source.provider !== activeSource) return false;
      if (hideRead && readSet.has(a.id)) return false;
      if (q) {
        const hay = `${a.title} ${a.summaryOneLine ?? ''} ${a.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [articles, query, activeSource, hideRead, readSet]);

  const unreadCount = articles.filter((a) => !readSet.has(a.id)).length;

  const handleArticleOpen = (id: string) => {
    readTracking.add(id);
    setReadSet((prev) => new Set([...prev, id]));
  };

  const [topStory, ...rest] = filtered;
  const groups = useMemo(() => groupByTime(rest), [rest]);

  const isFiltering = query.trim() !== '' || activeSource !== null || hideRead;

  return (
    <div>
      <HeroStrip
        total={articles.length}
        unread={unreadCount}
        sourceCount={sourceCounts.length}
        sources={sourceCounts.map(([provider, { name, count }]) => ({ provider, name, count }))}
        topTags={topTags}
        onTagClick={(t) => setQuery(t)}
      />

      {/* sticky 필터바 */}
      <div className="sticky top-0 z-20 -mx-6 sm:-mx-12 px-6 sm:px-12 py-3 mb-10 bg-black/85 backdrop-blur-md border-b border-zinc-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveSource(null)}
              className={`px-3 py-1 rounded-full transition-colors ${
                activeSource === null
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              전체
            </button>
            {sourceCounts.map(([provider, { name, count }]) => (
              <button
                key={provider}
                type="button"
                onClick={() => setActiveSource(provider === activeSource ? null : provider)}
                className={`px-3 py-1 rounded-full transition-colors ${
                  activeSource === provider
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {name} <span className="ml-0.5 text-zinc-600">{count}</span>
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setHideRead((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              hideRead
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 border border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {hideRead ? '본 글 가림' : '본 글 보임'}
          </button>

          <label htmlFor="search" className="sr-only">
            검색
          </label>
          <input
            id="search"
            type="search"
            placeholder="검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent text-sm outline-none border border-zinc-800 rounded-full px-4 py-1 w-48 focus:border-zinc-600 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-zinc-500 text-sm py-16 text-center">조건에 맞는 글이 없어요.</p>
      ) : isFiltering ? (
        <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2 items-start">
          {filtered.map((a) => (
            <li key={a.id}>
              <ArticleCard
                article={a}
                read={readSet.has(a.id)}
                onOpen={() => handleArticleOpen(a.id)}
                onTagClick={(tag) => setQuery(tag)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          {topStory && (
            <TopStoryCard
              article={topStory}
              read={readSet.has(topStory.id)}
              onOpen={() => handleArticleOpen(topStory.id)}
            />
          )}

          <ConferenceSection conferences={MOCK_CONFERENCES} />

          {groups.map((group, gi) => (
            <motion.section
              key={group.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: 0.1 + gi * 0.06 }}
              className="mb-14"
            >
              <div className="flex items-baseline gap-3 mb-7">
                <h3
                  className="text-[11px] tracking-[0.2em] uppercase"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {group.label}
                </h3>
                <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
                  {group.articles.length}
                </span>
                <span
                  className="flex-1 h-px"
                  style={{ background: 'var(--color-line)' }}
                />
              </div>
              <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2 items-start">
                {group.articles.map((a) => (
                  <li key={a.id}>
                    <ArticleCard
                      article={a}
                      read={readSet.has(a.id)}
                      onOpen={() => handleArticleOpen(a.id)}
                      onTagClick={(tag) => setQuery(tag)}
                    />
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </>
      )}

      <PageFooter total={articles.length} sourceCount={sourceCounts.length} />
    </div>
  );
}
