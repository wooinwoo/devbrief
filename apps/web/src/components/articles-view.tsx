'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import type { ArticleDto } from './article-card';
import type { VideoDto } from '@/lib/mock-videos';
import { ArticleCard } from './article-card';
import { TopStoryCard } from './top-story-card';
import { HeroStrip } from './hero-strip';
import { PageFooter } from './page-footer';
import { type InlineChatHandle } from './inline-chat';
import { ChatProvider } from './chat-context';
import { ChatDrawer } from './chat-drawer';
import { FloatingChatButton } from './floating-chat-button';
import { UpcomingRow } from './upcoming-row';
import { VideoRow } from './video-row';
import { readTracking } from '@/lib/read-tracking';
import { groupByTime, extractTopTags } from '@/lib/group-articles';

interface Props {
  articles: ArticleDto[];
  videos?: VideoDto[];
}

export function ArticlesView({ articles, videos }: Props) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [hideRead, setHideRead] = useState(false);

  useEffect(() => {
    setReadSet(readTracking.load());
  }, []);

  const chatRef = useRef<InlineChatHandle>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);
  const ask = useCallback((text: string) => {
    setChatOpen(true);
    requestAnimationFrame(() => chatRef.current?.ask(text));
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
    <ChatProvider ask={ask} open={openChat} close={closeChat} isOpen={chatOpen}>
    <div>
      <HeroStrip
        total={articles.length}
        unread={unreadCount}
        sourceCount={sourceCounts.length}
        sources={sourceCounts.map(([provider, { name, count }]) => ({ provider, name, count }))}
        topTags={topTags}
        onTagClick={(t) => setQuery(t)}
      />

      <UpcomingRow />

      <VideoRow videos={videos} />

      <div className="flex items-end justify-between mb-7 pb-4 border-b" style={{ borderColor: 'var(--color-line)' }}>
        <div>
          <h2
            className="text-[1.5rem] sm:text-[2.125rem] leading-none tracking-[-0.025em] break-keep"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            오늘 들어온 글
          </h2>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
              {articles.length}
            </span>
            개 모았어요. 시간 순으로 정리했어요.
          </p>
        </div>
      </div>

      {/* sticky 필터바 — 좌측 메인 컬럼 내부에서만 sticky */}
      <div
        className="sticky top-0 z-20 -mx-6 sm:-mx-10 lg:-mx-4 px-6 sm:px-10 lg:px-4 py-3 mb-10 backdrop-blur-md"
        style={{
          background: 'oklch(98% 0.004 80 / 0.85)',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
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

      {isFiltering && (
        <div
          className="mb-6 flex flex-wrap items-center gap-3 text-[12px]"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--color-accent)' }}
          />
          <span>
            <span style={{ color: 'var(--color-fg-strong)' }}>{filtered.length}</span>개 매칭
            {query.trim() && (
              <>
                {' '}
                · <span style={{ color: 'var(--color-accent)' }}>"{query.trim()}"</span>
              </>
            )}
            {activeSource && (
              <>
                {' '}
                ·{' '}
                <span style={{ color: 'var(--color-fg-default)' }}>
                  {sourceCounts.find(([p]) => p === activeSource)?.[1].name}
                </span>
              </>
            )}
          </span>

          <span className="flex-1 min-w-2" />

          {query.trim() && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => ask(`"${query.trim()}" 관련해서 정리해줘`)}
              className="text-[11px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors"
              style={{
                color: 'var(--color-accent)',
                border: '1px solid var(--color-line-strong)',
              }}
            >
              <span
                aria-hidden
                className="inline-block w-1 h-1 rounded-full"
                style={{ background: 'var(--color-accent)' }}
              />
              이 결과로 챗봇에 묻기
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveSource(null);
              setHideRead(false);
            }}
            className="text-[11px] transition-colors hover:text-(--color-fg-strong)"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            필터 초기화
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm py-16 text-center" style={{ color: 'var(--color-fg-muted)' }}>
          조건에 맞는 글이 없어요.
        </p>
      ) : isFiltering ? (
        <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
          {filtered.map((a) => (
            <li key={a.id}>
              <ArticleCard
                article={a}
                read={readSet.has(a.id)}
                onOpen={() => handleArticleOpen(a.id)}
                onTagClick={(tag) => setQuery(tag)}
                query={query}
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

          {groups.map((group, gi) => {
            // 그룹별 layout pattern 변주 — 잭 룰: 레이아웃 변주
            // 0: hero+stack (8/4 비대칭)  1: 3컬럼 grid  2: 가로 스크롤 갤러리
            // 3: 단줄 라인 리스트         4+: 4컬럼 compact
            const pattern = gi % 5;

            return (
              <motion.section
                key={group.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: 0.1 + gi * 0.06 }}
                className="mb-16"
              >
                <div className="flex items-baseline gap-4 mb-6">
                  <h3
                    className="text-[1.05rem] leading-none tracking-[-0.012em]"
                    style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
                  >
                    {group.label}
                  </h3>
                  <span
                    className="text-[12px] tabular-nums"
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    {group.articles.length}
                  </span>
                </div>

                {/* Pattern 0 — hero + side stack (8/4) */}
                {pattern === 0 && (
                  <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12 items-start">
                    {group.articles[0] && (
                      <div className="lg:col-span-7">
                        <ArticleCard
                          article={group.articles[0]}
                          read={readSet.has(group.articles[0].id)}
                          onOpen={() => handleArticleOpen(group.articles[0]!.id)}
                          onTagClick={(tag) => setQuery(tag)}
                          query={query}
                          variant="featured"
                        />
                      </div>
                    )}
                    <ul className="lg:col-span-5 space-y-6">
                      {group.articles.slice(1, 4).map((a) => (
                        <li key={a.id}>
                          <ArticleCard
                            article={a}
                            read={readSet.has(a.id)}
                            onOpen={() => handleArticleOpen(a.id)}
                            onTagClick={(tag) => setQuery(tag)}
                            query={query}
                            variant="compact"
                          />
                        </li>
                      ))}
                    </ul>
                    {group.articles.length > 4 && (
                      <ul className="lg:col-span-12 grid gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start mt-2">
                        {group.articles.slice(4).map((a) => (
                          <li key={a.id}>
                            <ArticleCard
                              article={a}
                              read={readSet.has(a.id)}
                              onOpen={() => handleArticleOpen(a.id)}
                              onTagClick={(tag) => setQuery(tag)}
                              query={query}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Pattern 1 — 3 컬럼 standard grid */}
                {pattern === 1 && (
                  <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3 items-start">
                    {group.articles.map((a) => (
                      <li key={a.id}>
                        <ArticleCard
                          article={a}
                          read={readSet.has(a.id)}
                          onOpen={() => handleArticleOpen(a.id)}
                          onTagClick={(tag) => setQuery(tag)}
                          query={query}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {/* Pattern 2 — 가로 스크롤 갤러리 (잭 시그니처) */}
                {pattern === 2 && (
                  <ul
                    className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 sm:-mx-10 sm:px-10 lg:-mx-16 lg:px-16 xl:-mx-24 xl:px-24"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {group.articles.map((a) => (
                      <li
                        key={a.id}
                        className="snap-start shrink-0 w-[280px] sm:w-[320px]"
                      >
                        <ArticleCard
                          article={a}
                          read={readSet.has(a.id)}
                          onOpen={() => handleArticleOpen(a.id)}
                          onTagClick={(tag) => setQuery(tag)}
                          query={query}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {/* Pattern 3 — 단줄 라인 리스트 (정보 밀도 ↑) */}
                {pattern === 3 && (
                  <ul className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
                    {group.articles.map((a) => (
                      <li
                        key={a.id}
                        className="py-2 first:pt-0"
                        style={{ borderColor: 'var(--color-line)' }}
                      >
                        <ArticleCard
                          article={a}
                          read={readSet.has(a.id)}
                          onOpen={() => handleArticleOpen(a.id)}
                          onTagClick={(tag) => setQuery(tag)}
                          query={query}
                          variant="compact"
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {/* Pattern 4+ — 4 컬럼 compact */}
                {pattern === 4 && (
                  <ul className="grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 items-start">
                    {group.articles.map((a) => (
                      <li key={a.id}>
                        <ArticleCard
                          article={a}
                          read={readSet.has(a.id)}
                          onOpen={() => handleArticleOpen(a.id)}
                          onTagClick={(tag) => setQuery(tag)}
                          query={query}
                          variant="compact"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </motion.section>
            );
          })}
        </>
      )}

      <PageFooter total={articles.length} sourceCount={sourceCounts.length} />
    </div>
    <ChatDrawer ref={chatRef} />
    <FloatingChatButton />
    </ChatProvider>
  );
}
