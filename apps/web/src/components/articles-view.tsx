'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ArticleDto } from './article-card';
import type { VideoDto } from '@/lib/mock-videos';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { DigestDto } from './daily-digest';
import { OverviewTab } from './tabs/overview-tab';
import { ArticlesTab } from './tabs/articles-tab';
import { ConferencesTab } from './tabs/conferences-tab';
import { VideosTab } from './tabs/videos-tab';
import { PageFooter } from './page-footer';
import { readTracking } from '@/lib/read-tracking';

interface Props {
  articles: ArticleDto[];
  videos?: VideoDto[];
  conferences?: ConferenceDto[];
  digest?: DigestDto | null;
}

type Tab = 'all' | 'articles' | 'conferences' | 'videos';

const TABS: Array<{ id: Tab; label: string; title: string }> = [
  { id: 'all', label: '전체', title: '오늘의 흐름' },
  { id: 'articles', label: '개발 뉴스', title: '개발 뉴스' },
  { id: 'conferences', label: '컨퍼런스', title: '개발자 컨퍼런스' },
  { id: 'videos', label: '발표 영상', title: '발표 영상' },
];

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function ArticlesView({
  articles,
  videos = [],
  conferences = [],
  digest = null,
}: Props) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'all';
  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === initialTab) ? initialTab : 'all',
  );
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [today, setToday] = useState('');

  useEffect(() => {
    setReadSet(readTracking.load());
    setToday(
      new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
    );
  }, []);

  const unreadCount = articles.filter((a) => !readSet.has(a.id)).length;
  const upcomingCount = useMemo(
    () => conferences.filter((c) => daysUntil(c.startDate) >= 0).length,
    [conferences],
  );

  const handleOpen = (id: string) => {
    readTracking.add(id);
    setReadSet((prev) => new Set([...prev, id]));
  };

  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <div className="w-full">
      {/* === 상단 가로 헤더 바 (sticky) ===================== */}
      <header
        className="sticky top-0 z-30 -mx-6 sm:-mx-10 lg:-mx-16 xl:-mx-24 px-6 sm:px-10 lg:px-16 xl:px-24 border-b backdrop-blur-md"
        style={{
          borderColor: 'var(--color-line)',
          background: 'oklch(96.5% 0.01 290 / 0.88)',
        }}
      >
        <div className="flex items-center gap-6 h-14">
          {/* 로고 */}
          <button
            type="button"
            onClick={() => setTab('all')}
            className="shrink-0 text-[18px] tracking-[-0.02em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 800 }}
          >
            Dev<span style={{ color: 'var(--color-accent)' }}>brief</span>
          </button>

          {/* 탭 nav */}
          <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {TABS.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-[13.5px] tracking-[-0.005em] transition-colors"
                  style={{
                    color: isActive
                      ? 'var(--color-fg-strong)'
                      : 'var(--color-fg-muted)',
                    background: isActive ? 'var(--color-bg-sunken)' : 'transparent',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* 우측 날짜 */}
          {today && (
            <span
              className="shrink-0 hidden sm:block text-[12px] tabular-nums"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              {today}
            </span>
          )}
        </div>
      </header>

      {/* === 페이지 제목 줄 ================================ */}
      <div className="flex items-end justify-between gap-4 flex-wrap mt-7 mb-6">
        <h1
          className="text-[1.625rem] sm:text-[2rem] leading-none tracking-[-0.03em] break-keep"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          {activeTab?.title ?? '오늘의 흐름'}
        </h1>
        <p
          className="text-[12.5px] tabular-nums pb-0.5"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          전체 {articles.length}
          <span style={{ color: 'var(--color-fg-subtle)' }}> · </span>
          안 본 글{' '}
          <span style={{ color: 'var(--color-accent-strong)', fontWeight: 700 }}>
            {unreadCount}
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}> · </span>
          컨퍼런스 {upcomingCount}
          <span style={{ color: 'var(--color-fg-subtle)' }}> · </span>
          영상 {videos.length}
        </p>
      </div>

      {/* === 탭별 레이아웃 (각자 다름) ====================== */}
      {tab === 'all' && (
        <OverviewTab
          articles={articles}
          conferences={conferences}
          videos={videos}
          digest={digest}
          readSet={readSet}
          onOpen={handleOpen}
          onMore={setTab}
        />
      )}
      {tab === 'articles' && (
        <ArticlesTab articles={articles} readSet={readSet} onOpen={handleOpen} />
      )}
      {tab === 'conferences' && <ConferencesTab conferences={conferences} />}
      {tab === 'videos' && <VideosTab videos={videos} />}

      <PageFooter total={articles.length} sourceCount={0} />
    </div>
  );
}
