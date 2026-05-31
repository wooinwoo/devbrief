import Link from 'next/link';

const API_BASE = 'http://localhost:4000/api/v1';

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
  const [articles, proposed, active, sources, videos, digest] =
    await Promise.all([
      safeJson<Article[]>('/articles?limit=200', []),
      safeJson<unknown[]>('/conferences?status=PROPOSED', []),
      safeJson<unknown[]>('/conferences?status=ACTIVE', []),
      safeJson<unknown[]>('/sources', []),
      safeJson<unknown[]>('/videos?limit=200', []),
      safeJson<{ items?: unknown[] } | null>('/digest/today', null),
    ]);

  const summarized = articles.filter((a) => a.summaryOneLine).length;
  const translated = articles.filter((a) => a.titleKo).length;

  const stats = [
    {
      label: '수집된 글',
      value: articles.length,
      sub: `요약 ${summarized} · 번역 ${translated}`,
    },
    {
      label: '컨퍼런스 후보',
      value: proposed.length,
      sub: '검토 대기',
      href: '/admin/conferences',
      accent: proposed.length > 0,
    },
    {
      label: '등록 컨퍼런스',
      value: active.length,
      sub: 'ACTIVE',
      href: '/admin/conferences',
    },
    {
      label: '발표 영상',
      value: videos.length,
      sub: 'YouTube',
      href: '/admin/videos',
    },
    {
      label: 'RSS 소스',
      value: sources.length,
      sub: '활성 피드',
      href: '/admin/sources',
    },
    {
      label: '오늘 다이제스트',
      value: digest?.items?.length ?? 0,
      sub: digest ? '생성됨' : '미생성',
    },
  ];

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
          수집 / 가공 현황 한눈에. 자동은 매일 09시 cron, 영상은 수동 추가.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {stats.map((s) => {
          const inner = (
            <div
              className="p-5 border rounded-lg h-full transition-colors hover:bg-(--color-bg-elevated)"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div
                className="text-[11px] tracking-wide uppercase mb-2"
                style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
              >
                {s.label}
              </div>
              <div
                className="text-[2rem] leading-none tabular-nums tracking-[-0.03em] mb-1"
                style={{
                  color: s.accent
                    ? 'var(--color-accent)'
                    : 'var(--color-fg-strong)',
                  fontWeight: 700,
                }}
              >
                {s.value}
              </div>
              <div
                className="text-[12px]"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                {s.sub}
              </div>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      {/* 빠른 액션 */}
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
          <QuickLink href="/admin/videos" label="영상 추가" />
          <QuickLink href="/admin/sources" label="RSS 소스 추가" />
          <QuickLink href="/admin/conferences" label="컨퍼런스 후보 검토" />
          <QuickLink href="/admin/chat" label="RAG 챗봇 열기" />
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3.5 py-2 text-[13px] rounded border transition-colors hover:bg-(--color-bg-elevated)"
      style={{
        borderColor: 'var(--color-line-strong)',
        color: 'var(--color-fg-default)',
        fontWeight: 500,
      }}
    >
      {label}
    </Link>
  );
}
