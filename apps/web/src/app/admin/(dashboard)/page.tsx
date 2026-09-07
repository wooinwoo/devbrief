import Link from 'next/link';

import { API_BASE } from '@/lib/api';

import { CollectionStats, type CollectionStatsData } from './collection-stats';

async function safeJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

interface SourceDto {
  active: boolean;
}

export default async function AdminDashboard() {
  // 글/영상 수는 목록 API length 가 아니라 /stats/collection 의 실제 count 를 쓴다.
  // 목록 API 는 서버에서 limit 을 100 으로 캡하므로(articles/videos controller 의
  // Math.min(limit, 100)), length 기반 집계는 100 에서 포화돼 통계가 왜곡된다.
  const [stats, proposed, active, sources, digest] = await Promise.all([
    safeJson<CollectionStatsData | null>('/stats/collection', null),
    safeJson<unknown[]>('/conferences?status=PROPOSED&upcoming=1&limit=1000', []),
    safeJson<unknown[]>('/conferences?status=ACTIVE&upcoming=1&limit=1000', []),
    safeJson<SourceDto[]>('/sources', []),
    safeJson<{ items?: unknown[] } | null>('/digest/today', null),
  ]);

  const total = stats?.articles.total ?? 0;
  const summarized = stats?.articles.summarized ?? 0;
  const pct = total > 0 ? Math.round((summarized / total) * 100) : 0;
  // GET /sources 는 비활성 소스도 포함하므로 '활성 피드'는 active 만 센다.
  const activeSources = sources.filter((s) => s.active).length;

  return (
    <div>
      <header className="mb-8">
        <h1
          className="text-[1.75rem] sm:text-[2rem] leading-tight tracking-[-0.025em] mb-3"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          대시보드
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-fg-muted)' }}>
          자동 수집은 매일 09시, 다이제스트는 09:30. 영상은 수동으로 추가합니다.
        </p>
      </header>

      {/* AI 가공 진행률 — 가장 중요한 운영 지표 */}
      <section
        className="mb-8 py-6 border-y"
        style={{
          borderColor: 'var(--color-line)',
        }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-3">
          <h2 className="text-[14px]" style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}>
            AI 요약 / 번역 진행
          </h2>
          <span className="text-[14px] tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
            <span style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}>{summarized}</span> /{' '}
            {total} · {pct}%
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--color-bg-sunken)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: 'var(--color-accent)',
            }}
          />
        </div>
        <p className="mt-2.5 text-[13px]" style={{ color: 'var(--color-fg-subtle)' }}>
          요약 큐는 분당 10건씩 처리됩니다. 남은 글은 백그라운드에서 채워집니다.
        </p>
      </section>

      {/* 통계 카드 */}
      <div className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3 mb-10">
        <StatCard label="수집된 글" value={total} sub={`요약 ${summarized}건`} />
        <StatCard
          label="행사 후보"
          value={proposed.length}
          sub="검토 대기"
          href="/admin/conferences"
          accent={proposed.length > 0}
        />
        <StatCard label="등록 행사" value={active.length} sub="노출 중" href="/admin/conferences" />
        <StatCard label="발표 영상" value={stats?.videos ?? 0} sub="YouTube" href="/admin/videos" />
        <StatCard
          label="RSS 소스"
          value={activeSources}
          sub={`활성 피드 · 전체 ${sources.length}개`}
          href="/admin/sources"
        />
        <StatCard
          label="오늘 다이제스트"
          value={digest?.items?.length ?? 0}
          sub={digest ? '생성됨' : '미생성'}
        />
      </div>

      {/* 수집 통계 위젯 — 7일 추이 / 소스별 / 가공 현황.
          서버에서 받은 스냅샷을 그대로 내려 이중 페치와 상단/하단 수치 불일치를 막는다. */}
      <CollectionStats initialData={stats} />

      {/* 빠른 작업 */}
      <section>
        <h2
          className="text-[18px] tracking-[-0.015em] mb-4 pt-6 border-t"
          style={{
            color: 'var(--color-fg-strong)',
            fontWeight: 700,
            borderColor: 'var(--color-line)',
          }}
        >
          빠른 작업
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickLink href="/admin/videos" label="영상 추가" primary />
          <QuickLink href="/admin/sources" label="RSS 소스 추가" />
          <QuickLink href="/admin/conferences" label="행사 검토" />
          <QuickLink href="/admin/chat" label="RAG 챗봇" />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className="py-5 border-b h-full transition-colors"
      style={{
        borderColor: 'var(--color-line)',
      }}
    >
      <div className="text-[14px] mb-3" style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}>
        {label}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span
          className="text-[1.75rem] leading-none tabular-nums tracking-[-0.025em]"
          style={{
            color: accent ? 'var(--color-accent)' : 'var(--color-fg-strong)',
            fontWeight: 700,
          }}
        >
          {value}
        </span>
        <span className="text-[12px]" style={{ color: 'var(--color-fg-subtle)' }}>
          {sub}
        </span>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

function QuickLink({
  href,
  label,
  primary,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center min-h-11 px-4 py-2 text-[14px] rounded-md transition-colors hover:opacity-80"
      style={
        primary
          ? {
              background: 'var(--color-fg-strong)',
              color: 'oklch(99% 0 0)',
              fontWeight: 600,
            }
          : {
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-line-strong)',
              color: 'var(--color-fg-default)',
              fontWeight: 500,
            }
      }
    >
      {label}
    </Link>
  );
}
