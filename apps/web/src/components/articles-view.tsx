'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ArticleDto } from './article-card';
import type { VideoDto } from '@/lib/mock-videos';
import type { ConferenceDto } from '@/lib/mock-conferences';
import { ArticleRow } from './article-row';
import { FeaturedArticle } from './featured-article';
import { SectionHeader } from './section-header';
import { DashboardSidebar } from './dashboard-sidebar';
import { PageFooter } from './page-footer';
import { readTracking } from '@/lib/read-tracking';
import { extractTopTags, groupByTime } from '@/lib/group-articles';
import { formatDuration } from '@/lib/format-duration';

interface Props {
  articles: ArticleDto[];
  videos?: VideoDto[];
  conferences?: ConferenceDto[];
}

type Tab = 'all' | 'articles' | 'conferences' | 'videos';

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: 'all', label: '전체', hint: 'feed' },
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
}: Props) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'all';
  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === initialTab) ? initialTab : 'all',
  );
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
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

  const topTags = useMemo(() => extractTopTags(articles, 12), [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (activeSource && a.source.provider !== activeSource) return false;
      if (hideRead && readSet.has(a.id)) return false;
      if (q) {
        const hay =
          `${a.title} ${a.summaryOneLine ?? ''} ${a.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [articles, query, activeSource, hideRead, readSet]);

  const unreadCount = articles.filter((a) => !readSet.has(a.id)).length;

  const upcomingConfs = useMemo(
    () =>
      conferences
        .filter((c) => daysUntil(c.startDate) >= 0)
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
    [conferences],
  );

  const handleArticleOpen = (id: string) => {
    readTracking.add(id);
    setReadSet((prev) => new Set([...prev, id]));
  };

  return (
    <div>
      {/* === 공통 헤더 ============================================ */}
      <header className="mb-6 pt-2">
        <div className="flex items-baseline gap-4 flex-wrap">
          <h1
            className="text-[1.5rem] sm:text-[1.875rem] leading-none tracking-[-0.025em] break-keep"
            style={{
              color: 'var(--color-fg-strong)',
              fontWeight: 700,
            }}
          >
            오늘의 흐름
          </h1>
          <span
            className="text-[12.5px] flex items-baseline gap-1.5"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            새 글{' '}
            <span
              className="px-1.5 py-px text-[12px] tabular-nums"
              style={{
                color: 'oklch(99% 0 0)',
                background: 'var(--color-accent)',
                fontWeight: 700,
                borderRadius: 2,
              }}
            >
              {unreadCount}
            </span>
            · 소스 {sourceCounts.length} · 컨퍼런스 {upcomingConfs.length} ·
            영상 {videos.length}
          </span>
        </div>
      </header>

      {/* === 공통 탭 nav ========================================== */}
      <nav
        className="flex items-end gap-0 mb-0 border-b sticky top-0 z-20 backdrop-blur-md"
        style={{
          borderColor: 'var(--color-line)',
          background: 'oklch(98% 0.004 80 / 0.88)',
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
                  style={{ background: 'var(--color-fg-strong)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* === 공통 grid: main + sidebar ============================= */}
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] mt-6">
        <main className="min-w-0">
          {/* 메인 영역만 탭별로 swap. 헤더/탭/grid는 동일 → 흔들림 X */}
          {(tab === 'all' || tab === 'articles') && (
            <ArticlesPanel
              filtered={filtered}
              all={articles}
              sourceCounts={sourceCounts}
              activeSource={activeSource}
              setActiveSource={setActiveSource}
              hideRead={hideRead}
              setHideRead={setHideRead}
              query={query}
              setQuery={setQuery}
              readSet={readSet}
              onOpen={handleArticleOpen}
              onTagClick={(t) => setQuery(t === query ? '' : t)}
            />
          )}

          {tab === 'conferences' && (
            <ConferencesTab conferences={upcomingConfs} />
          )}

          {tab === 'videos' && <VideosTab videos={videos} />}
        </main>

        {/* sticky sidebar */}
        <div className="lg:sticky lg:top-14 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto pr-1">
          <DashboardSidebar
            conferences={conferences}
            videos={videos}
            topTags={topTags}
            activeTag={query}
            onTagClick={(t) => setQuery(t === query ? '' : t)}
          />
        </div>
      </div>

      <PageFooter total={articles.length} sourceCount={sourceCounts.length} />
    </div>
  );
}

// ── ArticlesPanel ──────────────────────────────────────────────────────────
interface ArticlesPanelProps {
  filtered: ArticleDto[];
  all: ArticleDto[];
  sourceCounts: Array<[string, { name: string; count: number }]>;
  activeSource: string | null;
  setActiveSource: (s: string | null) => void;
  hideRead: boolean;
  setHideRead: (v: boolean) => void;
  query: string;
  setQuery: (q: string) => void;
  readSet: Set<string>;
  onOpen: (id: string) => void;
  onTagClick: (t: string) => void;
}

function ArticlesPanel({
  filtered,
  sourceCounts,
  activeSource,
  setActiveSource,
  hideRead,
  setHideRead,
  query,
  setQuery,
  readSet,
  onOpen,
  onTagClick,
}: ArticlesPanelProps) {
  // filtered 첫 글 = featured, 그 외는 시간 그룹
  const [featured, ...rest] = filtered;
  const grouped = useMemo(() => groupByTime(rest), [rest]);

  const isFiltering =
    query.trim() !== '' || activeSource !== null || hideRead;

  return (
    <>
      {/* 필터 chip + 검색 — sticky 탭 아래 */}
      <div className="flex flex-wrap items-center gap-1.5 mb-6 text-[12px]">
        <FilterChip
          active={activeSource === null}
          onClick={() => setActiveSource(null)}
        >
          전체{' '}
          <span className="ml-1 tabular-nums opacity-60">{filtered.length}</span>
        </FilterChip>
        {sourceCounts.map(([provider, { name, count }]) => (
          <FilterChip
            key={provider}
            active={activeSource === provider}
            onClick={() =>
              setActiveSource(provider === activeSource ? null : provider)
            }
          >
            {name}{' '}
            <span className="ml-1 tabular-nums opacity-60">{count}</span>
          </FilterChip>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setHideRead(!hideRead)}
          className="text-[12px] transition-colors"
          style={{
            color: hideRead
              ? 'var(--color-fg-strong)'
              : 'var(--color-fg-muted)',
            fontWeight: 500,
          }}
        >
          {hideRead ? '✓ 본 글 가림' : '본 글 가리기'}
        </button>
        <input
          type="search"
          placeholder="검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-2 px-2.5 py-1 text-[12px] outline-none rounded border w-36 focus:w-52 transition-all"
          style={{ borderColor: 'var(--color-line-strong)' }}
        />
      </div>

      {filtered.length === 0 ? (
        <p
          className="py-10 text-center text-[13px]"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          조건에 맞는 글이 없어요.
        </p>
      ) : isFiltering ? (
        // 필터링 시: featured 없이 dense list만 (정보 밀도 ↑)
        <>
          <SectionHeader
            label="검색 결과"
            count={filtered.length}
            hint={`matched · ${query.trim() || activeSource || 'filter'}`}
          />
          <ul>
            {filtered.map((a, i) => (
              <ArticleRow
                key={a.id}
                article={a}
                read={readSet.has(a.id)}
                onOpen={() => onOpen(a.id)}
                onTagClick={onTagClick}
                index={i}
              />
            ))}
          </ul>
        </>
      ) : (
        // 기본: featured + 시간 그룹별 dense list
        <>
          {featured && (
            <FeaturedArticle
              article={featured}
              read={readSet.has(featured.id)}
              onOpen={() => onOpen(featured.id)}
            />
          )}

          {grouped.map((group, gi) => {
            const baseIdx = grouped
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
                      onOpen={() => onOpen(a.id)}
                      onTagClick={onTagClick}
                      index={baseIdx + i}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}

const SECTION_HINT: Record<string, string> = {
  방금: 'just in',
  오늘: 'today',
  어제: 'yesterday',
  '이번 주': 'this week',
  '그 외': 'older',
};

// ── FilterChip ─────────────────────────────────────────────────────────────
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded transition-colors"
      style={{
        background: active ? 'var(--color-fg-strong)' : 'transparent',
        color: active ? 'oklch(99% 0 0)' : 'var(--color-fg-muted)',
        border: active ? 'none' : '1px solid var(--color-line)',
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}

// ── 컨퍼런스 탭 ─────────────────────────────────────────────────────────────
function ConferencesTab({ conferences }: { conferences: ConferenceDto[] }) {
  if (conferences.length === 0) {
    return (
      <p
        className="py-10 text-center text-[13px]"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        예정된 컨퍼런스가 없어요.
      </p>
    );
  }

  // 시간 버킷: 이번 달 / 다음 달 / 그 이후
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const buckets: Record<string, ConferenceDto[]> = {
    '이번 달': [],
    '다음 달': [],
    '그 이후': [],
  };
  for (const c of conferences) {
    const d = new Date(c.startDate);
    if (d.getFullYear() === thisYear && d.getMonth() === thisMonth)
      buckets['이번 달'].push(c);
    else if (
      (d.getFullYear() === thisYear && d.getMonth() === thisMonth + 1) ||
      (thisMonth === 11 &&
        d.getFullYear() === thisYear + 1 &&
        d.getMonth() === 0)
    )
      buckets['다음 달'].push(c);
    else buckets['그 이후'].push(c);
  }

  return (
    <>
      {Object.entries(buckets)
        .filter(([, list]) => list.length > 0)
        .map(([label, list]) => (
          <section key={label} className="mb-8">
            <SectionHeader
              label={label}
              count={list.length}
              hint={
                label === '이번 달'
                  ? 'this month'
                  : label === '다음 달'
                    ? 'next month'
                    : 'later'
              }
            />
            <ul>
              {list.map((c) => {
                const d = daysUntil(c.startDate);
                const brand = c.brand ?? 'oklch(50% 0.012 245)';
                return (
                  <li
                    key={c.id}
                    className="grid grid-cols-[auto_auto_1fr_auto] gap-4 items-baseline py-3 px-2 -mx-2 border-b transition-colors hover:bg-(--color-bg-elevated)/40"
                    style={{ borderColor: 'var(--color-line)' }}
                  >
                    <span
                      className="tabular-nums text-[12.5px] shrink-0 px-2 py-0.5 self-baseline"
                      style={{
                        background: brand,
                        color: 'oklch(99% 0 0)',
                        fontWeight: 700,
                        borderRadius: 2,
                        minWidth: 48,
                        textAlign: 'center',
                      }}
                    >
                      D-{d}
                    </span>
                    <span
                      className="text-[12px] tabular-nums shrink-0 w-20"
                      style={{ color: 'var(--color-fg-muted)' }}
                    >
                      {new Date(c.startDate).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 block"
                    >
                      <span
                        className="text-[14.5px] tracking-[-0.005em] hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
                        style={{
                          color: 'var(--color-fg-strong)',
                          fontWeight: 600,
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        className="ml-3 text-[12px]"
                        style={{ color: 'var(--color-fg-muted)' }}
                      >
                        {c.location}
                      </span>
                      {c.topics.length > 0 && (
                        <span
                          className="ml-2 text-[11.5px]"
                          style={{ color: 'var(--color-fg-subtle)' }}
                        >
                          {c.topics
                            .slice(0, 3)
                            .map((t) => `#${t}`)
                            .join(' ')}
                        </span>
                      )}
                    </a>
                    <span
                      className="text-[11.5px] tracking-wide"
                      style={{ color: 'var(--color-fg-subtle)' }}
                    >
                      사이트 ↗
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </>
  );
}

// ── 영상 탭 ────────────────────────────────────────────────────────────────
function VideosTab({ videos }: { videos: VideoDto[] }) {
  if (videos.length === 0) {
    return (
      <p
        className="py-10 text-center text-[13px]"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        영상이 없어요.
      </p>
    );
  }
  return (
    <>
      <SectionHeader
        label="이번 주 발표"
        count={videos.length}
        hint="recent talks"
      />
      <ul>
        {videos.map((v) => (
          <li
            key={v.id}
            className="grid grid-cols-[auto_auto_1fr_auto] gap-4 items-baseline py-3 px-2 -mx-2 border-b transition-colors hover:bg-(--color-bg-elevated)/40"
            style={{ borderColor: 'var(--color-line)' }}
          >
            <span
              className="tabular-nums text-[11.5px] shrink-0 px-2 py-0.5"
              style={{
                color: 'var(--color-fg-muted)',
                border: '1px solid var(--color-line-strong)',
                borderRadius: 2,
                minWidth: 52,
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {formatDuration(v.durationSec)}
            </span>
            <span
              className="text-[12px] shrink-0 truncate w-28"
              style={{
                color: 'var(--color-fg-default)',
                fontWeight: 600,
              }}
              title={v.channel}
            >
              {v.channel}
            </span>
            <a
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 block truncate text-[14.5px] tracking-[-0.005em] hover:underline underline-offset-2"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
              title={v.title}
            >
              {v.title}
            </a>
            <span
              className="tabular-nums text-[11.5px] shrink-0"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              {Math.round(v.views / 1000)}K
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
