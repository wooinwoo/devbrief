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

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: 'all', label: '전체', hint: 'overview' },
  { id: 'articles', label: '개발 뉴스', hint: '글' },
  { id: 'conferences', label: '컨퍼런스', hint: '일정' },
  { id: 'videos', label: '발표 영상', hint: 'youtube' },
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

  return (
    <div className="w-full">
      {/* === 헤더 (신문 1면 마스트헤드) ===================== */}
      <header className="mb-6">
        {/* 마스트헤드 라인: 로고 · 날짜 */}
        <div
          className="flex items-center justify-between pb-2 mb-4 border-b"
          style={{ borderColor: 'var(--color-fg-strong)' }}
        >
          <span
            className="text-[12px] tracking-[0.3em] uppercase"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            Pulse
          </span>
          {today && (
            <span
              className="text-[11.5px] tabular-nums"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              {today}
            </span>
          )}
        </div>

        {/* 제호 + 통계 한 줄 */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1
            className="text-[2rem] sm:text-[2.5rem] leading-[0.95] tracking-[-0.035em] break-keep"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            오늘의 흐름
          </h1>
          <p
            className="text-[12.5px] tabular-nums pb-1"
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
      </header>

      {/* === 공통 탭 nav (sticky) =========================== */}
      <nav
        className="flex items-end gap-0 mb-6 border-b sticky top-0 z-20 backdrop-blur-md"
        style={{
          borderColor: 'var(--color-line)',
          background: 'oklch(98.5% 0.006 290 / 0.85)',
        }}
      >
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="relative px-3.5 py-3 text-[13px] tracking-[-0.005em] transition-colors"
              style={{
                color: isActive
                  ? 'var(--color-fg-strong)'
                  : 'var(--color-fg-muted)',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {t.label}
              <span
                className="ml-1.5 text-[9.5px] tabular-nums tracking-[0.18em] uppercase"
                style={{ color: 'var(--color-fg-subtle)', fontWeight: 600 }}
              >
                {t.hint}
              </span>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-[2px]"
                  style={{ background: 'var(--color-accent)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

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
