'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ArticleDto } from './article-card';
import { ArticleCard } from './article-card';
import { readTracking } from '@/lib/read-tracking';

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

  // 소스 통계
  const sourceCounts = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const a of articles) {
      const cur = map.get(a.source.provider);
      if (cur) cur.count += 1;
      else map.set(a.source.provider, { name: a.source.name, count: 1 });
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [articles]);

  // 필터링
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

  return (
    <div>
      {/* 메타 + 필터 바 */}
      <div className="sticky top-0 z-10 -mx-6 sm:-mx-12 px-6 sm:px-12 py-4 mb-8 bg-black/80 backdrop-blur-md border-b border-zinc-900">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-zinc-500">
            전체 <span className="text-zinc-300 font-medium">{articles.length}</span>
            <span className="mx-2 text-zinc-700">·</span>
            안 본 글 <span className="text-emerald-400 font-medium">{unreadCount}</span>
          </span>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setHideRead((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
              hideRead
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-transparent text-zinc-400 border border-zinc-800 hover:border-zinc-600'
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
            placeholder="검색 (제목 / 요약 / 태그)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent text-sm outline-none border border-zinc-800 rounded-full px-4 py-1.5 w-64 focus:border-zinc-600 placeholder:text-zinc-600"
          />
        </div>

        {/* 소스 필터 (chip) */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveSource(null)}
            className={`px-3 py-1 rounded-full transition-colors ${
              activeSource === null
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200'
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
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {name} {count}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 */}
      {filtered.length === 0 ? (
        <p className="text-zinc-500 text-sm py-16 text-center">조건에 맞는 글이 없어요.</p>
      ) : (
        <ul className="space-y-10">
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
      )}
    </div>
  );
}
