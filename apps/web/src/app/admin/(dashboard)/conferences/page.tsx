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
    const res = await fetch(`${API_BASE}/conferences?status=PROPOSED`, {
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
    const res = await fetch(`${API_BASE}/conferences?status=ACTIVE`, {
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
          className="text-[2rem] leading-none tracking-[-0.025em] break-keep mb-2"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          컨퍼런스 후보 검토
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
          매일 자정 자동 발견된 후보를 검토하고 승인하거나 거절합니다.
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
            이미 등록된 컨퍼런스
          </h2>
          <span className="text-[12px] tabular-nums" style={{ color: 'var(--color-fg-subtle)' }}>
            {active.length}
          </span>
        </div>
        <ul>
          {active.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-4 py-3 border-b text-[13px]"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <span
                aria-hidden
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: c.brandColor ?? 'var(--color-fg-subtle)' }}
              />
              <span style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}>{c.name}</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>{c.location}</span>
              <span className="flex-1" />
              <span className="tabular-nums" style={{ color: 'var(--color-fg-subtle)' }}>
                {new Date(c.startDate).toLocaleDateString('ko-KR')}
              </span>
            </li>
          ))}
          {active.length === 0 && (
            <li className="py-6 text-center text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
              등록된 컨퍼런스가 없어요.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
