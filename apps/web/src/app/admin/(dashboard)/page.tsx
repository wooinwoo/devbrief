import Link from 'next/link';

import { API_BASE } from '@/lib/api';

async function safeJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

interface Article {
  summaryOneLine: string | null;
  titleKo: string | null;
}

export default async function AdminDashboard() {
  const [articles, proposed, active, sources, videos, digest] = await Promise.all([
    safeJson<Article[]>('/articles?limit=200', []),
    safeJson<unknown[]>('/conferences?status=PROPOSED', []),
    safeJson<unknown[]>('/conferences?status=ACTIVE', []),
    safeJson<unknown[]>('/sources', []),
    safeJson<unknown[]>('/videos?limit=200', []),
    safeJson<{ items?: unknown[] } | null>('/digest/today', null),
  ]);

  const total = articles.length;
  const summarized = articles.filter((a) => a.summaryOneLine).length;
  const pct = total > 0 ? Math.round((summarized / total) * 100) : 0;

  return (
    <div>
      <header className="mb-8">
        <h1
          className="text-[1.75rem] tracking-[-0.025em] mb-1"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          대시보드
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
          자동 수집은 매일 09시, 다이제스트는 09:30. 영상은 수동으로 추가합니다.
        </p>
      </header>

      {/* AI 가공 진행률 — 가장 중요한 운영 지표 */}
      <section
        className="mb-8 p-5 rounded-xl border"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-line)',
        }}
      >
        <div className="flex items-baseline justify-between mb-3">
          <span
            className="text-[13px]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            AI 요약 / 번역 진행
          </span>
          <span className="text-[13px] tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
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
        <p className="mt-2.5 text-[11.5px]" style={{ color: 'var(--color-fg-subtle)' }}>
          요약 큐는 분당 10건씩 처리됩니다. 남은 글은 백그라운드에서 채워집니다.
        </p>
      </section>

      {/* 통계 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        <StatCard
          label="수집된 글"
          value={total}
          sub={`번역 ${articles.filter((a) => a.titleKo).length}건`}
        />
        <StatCard
          label="컨퍼런스 후보"
          value={proposed.length}
          sub="검토 대기"
          href="/admin/conferences"
          accent={proposed.length > 0}
        />
        <StatCard
          label="등록 컨퍼런스"
          value={active.length}
          sub="노출 중"
          href="/admin/conferences"
        />
        <StatCard label="발표 영상" value={videos.length} sub="YouTube" href="/admin/videos" />
        <StatCard label="RSS 소스" value={sources.length} sub="활성 피드" href="/admin/sources" />
        <StatCard
          label="오늘 다이제스트"
          value={digest?.items?.length ?? 0}
          sub={digest ? '생성됨' : '미생성'}
        />
      </div>

      {/* 빠른 작업 */}
      <section>
        <h2
          className="text-[13px] tracking-[-0.005em] mb-3 pt-1 border-t-2"
          style={{
            color: 'var(--color-fg-strong)',
            fontWeight: 700,
            borderColor: 'var(--color-fg-strong)',
          }}
        >
          빠른 작업
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickLink href="/admin/videos" label="＋ 영상 추가" primary />
          <QuickLink href="/admin/sources" label="＋ RSS 소스" />
          <QuickLink href="/admin/conferences" label="컨퍼런스 검토" />
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
      className="p-5 rounded-xl border h-full transition-all hover:-translate-y-0.5"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: accent ? 'var(--color-accent)' : 'var(--color-line)',
        boxShadow: '0 1px 2px oklch(0% 0 0 / 0.04)',
      }}
    >
      <div className="text-[12px] mb-3" style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}>
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[2.25rem] leading-none tabular-nums tracking-[-0.04em]"
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
      className="px-4 py-2 text-[13px] rounded-lg transition-all hover:-translate-y-0.5"
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
