'use client';

import { useEffect, useState } from 'react';

import { API_BASE } from '@/lib/api';

interface SourceCount {
  sourceId: string;
  name: string;
  count: number;
}

interface DailyCount {
  date: string;
  count: number;
}

interface CollectionStats {
  articles: {
    total: number;
    summarized: number;
    unsummarized: number;
    embedded: number;
  };
  topSources: SourceCount[];
  recentDaily: DailyCount[];
  conferences: number;
  videos: number;
  repos: number;
}

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: CollectionStats };

/** 요일 (월~일) — 막대 보조 라벨 */
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
function weekday(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return WEEKDAY[day];
}

export function CollectionStats() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    fetch(`${API_BASE}/stats/collection`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`stats ${res.status}`);
        return res.json() as Promise<CollectionStats>;
      })
      .then((data) => {
        if (alive) setState({ status: 'ready', data });
      })
      .catch(() => {
        if (alive) setState({ status: 'error' });
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="mb-10" aria-labelledby="collection-stats-heading">
      <h2
        className="text-[13px] tracking-[-0.005em] mb-4 pt-1 border-t-2"
        id="collection-stats-heading"
        style={{
          color: 'var(--color-fg-strong)',
          fontWeight: 700,
          borderColor: 'var(--color-fg-strong)',
        }}
      >
        수집 통계
      </h2>

      {state.status === 'loading' && <StatsSkeleton />}
      {state.status === 'error' && <StatsError onRetry={() => location.reload()} />}
      {state.status === 'ready' && <StatsBody data={state.data} />}
    </section>
  );
}

function StatsBody({ data }: { data: CollectionStats }) {
  const { articles, topSources, recentDaily, conferences, videos, repos } = data;
  const embedPct = articles.total > 0 ? Math.round((articles.embedded / articles.total) * 100) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <TrendChart days={recentDaily} />

      <SourceBreakdown sources={topSources} />

      <Panel title="가공 현황">
        <dl className="space-y-3">
          <MetricRow label="요약 대기" value={articles.unsummarized} unit="건" />
          <MetricRow label="임베딩 완료" value={articles.embedded} unit={`건 · ${embedPct}%`} />
          <MetricRow label="등록 레포" value={repos} unit="건" />
          <MetricRow label="컨퍼런스" value={conferences} unit="건" />
          <MetricRow label="발표 영상" value={videos} unit="건" />
        </dl>
      </Panel>
    </div>
  );
}

function TrendChart({ days }: { days: DailyCount[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const totalWeek = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <Panel title="최근 7일 수집" sub={`${totalWeek}건`}>
      {totalWeek === 0 ? (
        <p className="text-[12px] py-6" style={{ color: 'var(--color-fg-subtle)' }}>
          최근 7일간 수집된 글이 없어요.
        </p>
      ) : (
        <ul className="flex items-end gap-1.5 h-[88px]" aria-hidden="false">
          {days.map((d) => {
            const ratio = Math.round((d.count / max) * 100);
            return (
              <li
                key={d.date}
                className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full"
              >
                <span
                  className="text-[10px] tabular-nums leading-none"
                  style={{ color: 'var(--color-fg-subtle)' }}
                >
                  {d.count}
                </span>
                <div
                  className="w-full rounded-t-sm motion-safe:transition-[height] motion-safe:duration-300"
                  style={{
                    height: `${Math.max(ratio, d.count > 0 ? 6 : 2)}%`,
                    background: d.count > 0 ? 'var(--color-accent)' : 'var(--color-bg-sunken)',
                  }}
                  title={`${d.date} · ${d.count}건`}
                />
                <span
                  className="text-[10px] leading-none"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {weekday(d.date)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function SourceBreakdown({ sources }: { sources: SourceCount[] }) {
  const max = Math.max(1, ...sources.map((s) => s.count));

  return (
    <Panel title="소스별 글 수" sub={`상위 ${sources.length}`}>
      {sources.length === 0 ? (
        <p className="text-[12px] py-6" style={{ color: 'var(--color-fg-subtle)' }}>
          아직 수집된 글이 없어요.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {sources.map((s) => (
            <li key={s.sourceId}>
              <div className="flex items-baseline justify-between mb-1 gap-2">
                <span
                  className="text-[12px] truncate"
                  style={{ color: 'var(--color-fg-default)' }}
                  title={s.name}
                >
                  {s.name}
                </span>
                <span
                  className="text-[12px] tabular-nums shrink-0"
                  style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
                >
                  {s.count}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--color-bg-sunken)' }}
              >
                <div
                  className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300"
                  style={{
                    width: `${Math.round((s.count / max) * 100)}%`,
                    background: 'var(--color-accent-soft)',
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Panel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="p-5 rounded-xl border"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-line)',
      }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[12px]" style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}>
          {title}
        </h3>
        {sub && (
          <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
            {sub}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[12px]" style={{ color: 'var(--color-fg-muted)' }}>
        {label}
      </dt>
      <dd
        className="text-[13px] tabular-nums"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
      >
        {value} <span style={{ color: 'var(--color-fg-subtle)', fontWeight: 400 }}>{unit}</span>
      </dd>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="p-5 rounded-xl border h-[180px] motion-safe:animate-pulse"
          style={{
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-line)',
          }}
        />
      ))}
    </div>
  );
}

function StatsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="p-5 rounded-xl border flex items-center justify-between gap-3"
      role="alert"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-line)',
      }}
    >
      <p className="text-[12px]" style={{ color: 'var(--color-fg-muted)' }}>
        통계를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1.5 text-[12px] rounded-lg shrink-0"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-line-strong)',
          color: 'var(--color-fg-default)',
          fontWeight: 600,
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
