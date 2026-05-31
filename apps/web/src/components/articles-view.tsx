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
      {/* === 공통 헤더 (hero 카드) ========================= */}
      <header
        className="relative overflow-hidden mb-6 px-6 sm:px-8 py-7 sm:py-8 rounded-2xl border"
        style={{
          background:
            'linear-gradient(120deg, oklch(96% 0.03 292) 0%, var(--color-bg-elevated) 55%)',
          borderColor: 'var(--color-line)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* 배경 장식 글로우 */}
        <div
          aria-hidden
          className="absolute -top-20 -right-10 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'oklch(70% 0.18 292 / 0.2)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 right-1/3 w-56 h-56 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'oklch(72% 0.14 240 / 0.12)' }}
        />

        <div className="relative">
          {/* 상단: 로고 + 날짜 */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[14px]"
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-accent), oklch(60% 0.2 260))',
                  color: 'oklch(99% 0 0)',
                }}
              >
                ⚡
              </span>
              <span
                className="text-[13px] tracking-[0.26em] uppercase"
                style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
              >
                Pulse
              </span>
            </div>
            {today && (
              <span
                className="text-[12px] tabular-nums px-2.5 py-1 rounded-full"
                style={{
                  color: 'var(--color-fg-muted)',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-line)',
                }}
              >
                {today}
              </span>
            )}
          </div>

          {/* 타이틀 + 인사 */}
          <h1
            className="text-[1.75rem] sm:text-[2.25rem] leading-[1.1] tracking-[-0.03em] break-keep mb-2"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            오늘의 흐름
          </h1>
          <p className="text-[13.5px] mb-5" style={{ color: 'var(--color-fg-muted)' }}>
            {unreadCount > 0 ? (
              <>
                새로 들어온 글{' '}
                <span style={{ color: 'var(--color-accent-strong)', fontWeight: 700 }}>
                  {unreadCount}
                </span>
                개. 오늘 무엇이 궁금한가요?
              </>
            ) : (
              '오늘 들어온 글을 모두 확인했어요.'
            )}
          </p>

          {/* 통계 pill */}
          <div className="flex flex-wrap gap-2">
            <StatPill label="전체 글" value={articles.length} />
            <StatPill label="안 본 글" value={unreadCount} accent />
            <StatPill label="컨퍼런스" value={upcomingCount} />
            <StatPill label="발표 영상" value={videos.length} />
          </div>
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

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: accent
          ? 'var(--color-accent)'
          : 'var(--color-bg-elevated)',
        border: accent ? 'none' : '1px solid var(--color-line)',
      }}
    >
      <span
        className="text-[15px] tabular-nums leading-none tracking-[-0.02em]"
        style={{
          color: accent ? 'oklch(99% 0 0)' : 'var(--color-fg-strong)',
          fontWeight: 700,
        }}
      >
        {value}
      </span>
      <span
        className="text-[11.5px]"
        style={{
          color: accent ? 'oklch(99% 0 0 / 0.85)' : 'var(--color-fg-muted)',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </div>
  );
}
