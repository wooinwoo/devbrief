import { ProposedConferenceList } from './proposed-list';

interface ProposedConference {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate: string | null;
  location: string;
  topics: string[];
  imageUrl: string | null;
  brandColor: string | null;
  discoveredFromArticleId: string | null;
  discoveredAt: string | null;
}

import { API_BASE } from '@/lib/api';

async function getProposed(): Promise<ProposedConference[]> {
  try {
    const res = await fetch(`${API_BASE}/conferences?status=PROPOSED&upcoming=1&limit=1000`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return (await res.json()) as ProposedConference[];
  } catch {
    return [];
  }
}

async function getActive(): Promise<ProposedConference[]> {
  try {
    const res = await fetch(`${API_BASE}/conferences?status=ACTIVE&upcoming=1&limit=1000`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return (await res.json()) as ProposedConference[];
  } catch {
    return [];
  }
}

export default async function AdminConferencesPage() {
  const [proposed, active] = await Promise.all([getProposed(), getActive()]);

  return (
    <div>
      <header className="mb-10">
        <h1
          className="text-[1.75rem] sm:text-[2rem] leading-tight tracking-[-0.025em] break-keep mb-3"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          컨퍼런스·해커톤 후보 검토
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-fg-muted)' }}>
          공개 일정과 기사에서 수집한 후보입니다. 공식 일정과 참가 조건을 확인한 뒤 승인하세요.
        </p>
      </header>

      <section className="mb-16">
        <div
          className="flex items-baseline gap-3 mb-5 pb-3 border-b"
          style={{ borderColor: 'var(--color-line)' }}
        >
          <h2
            className="text-[15px] tracking-[-0.005em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
          >
            대기 중인 후보
          </h2>
          <span className="text-[12px] tabular-nums" style={{ color: 'var(--color-fg-subtle)' }}>
            {proposed.length}
          </span>
        </div>
        <ProposedConferenceList items={proposed} />
      </section>

      <section>
        <div
          className="flex items-baseline gap-3 mb-5 pb-3 border-b"
          style={{ borderColor: 'var(--color-line)' }}
        >
          <h2
            className="text-[15px] tracking-[-0.005em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
          >
            이미 등록된 행사
          </h2>
          <span className="text-[12px] tabular-nums" style={{ color: 'var(--color-fg-subtle)' }}>
            {active.length}
          </span>
        </div>
        <ul>
          {active.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[8px_minmax(0,1fr)] sm:flex sm:items-center gap-x-4 gap-y-2 py-4 border-b text-[14px]"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <span
                aria-hidden
                className="inline-block w-2 h-2 mt-2 sm:mt-0 rounded-full shrink-0"
                style={{ background: c.brandColor ?? 'var(--color-fg-subtle)' }}
              />
              <span style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}>{c.name}</span>
              <span className="col-start-2" style={{ color: 'var(--color-fg-muted)' }}>
                {c.location}
              </span>
              <span className="hidden sm:block flex-1" />
              <span
                className="col-start-2 tabular-nums shrink-0"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                {new Date(c.startDate).toLocaleDateString('ko-KR')}
              </span>
            </li>
          ))}
          {active.length === 0 && (
            <li className="py-6 text-center text-[14px]" style={{ color: 'var(--color-fg-muted)' }}>
              등록된 행사가 없어요.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
