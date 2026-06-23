'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

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

export function ProposedConferenceList({ items }: { items: ProposedConference[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id);
    try {
      await fetch(`${API_BASE}/conferences/${id}/${action}`, { method: 'POST' });
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
        대기 중인 후보가 없어요. 매일 자정 자동 발견이 실행됩니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-4">
      {items.map((c) => {
        const isProposedUrl = c.url.startsWith('proposed://');
        return (
          <li
            key={c.id}
            className="grid grid-cols-[1fr_auto] gap-6 p-5 border"
            style={{ borderColor: 'var(--color-line)', borderRadius: 4 }}
          >
            <div>
              <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                <h3
                  className="text-[1.125rem] tracking-[-0.005em] break-keep"
                  style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
                >
                  {c.name}
                </h3>
                {!isProposedUrl && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] tracking-wide"
                    style={{ color: 'var(--color-fg-muted)' }}
                  >
                    {c.url} ↗
                  </a>
                )}
                {isProposedUrl && (
                  <span
                    className="text-[11px] tracking-wide px-2 py-0.5 rounded"
                    style={{
                      color: 'var(--color-fg-muted)',
                      background: 'var(--color-bg-subtle)',
                    }}
                  >
                    URL 미상
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] mb-3">
                <span style={{ color: 'var(--color-fg-default)' }}>
                  {new Date(c.startDate).toLocaleDateString('ko-KR')}
                  {c.endDate &&
                    c.endDate !== c.startDate &&
                    ` ~ ${new Date(c.endDate).toLocaleDateString('ko-KR')}`}
                </span>
                <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                <span style={{ color: 'var(--color-fg-muted)' }}>{c.location}</span>
                {c.discoveredAt && (
                  <>
                    <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                    <span style={{ color: 'var(--color-fg-subtle)' }}>
                      {new Date(c.discoveredAt).toLocaleDateString('ko-KR')} 발견
                    </span>
                  </>
                )}
              </div>
              {c.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {c.topics.slice(0, 6).map((t) => (
                    <span key={t} style={{ color: 'var(--color-fg-subtle)' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              {c.discoveredFromArticleId && (
                <p className="mt-2 text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
                  발견 출처: {c.discoveredFromArticleId}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 self-start">
              <button
                type="button"
                onClick={() => act(c.id, 'approve')}
                disabled={busy === c.id || isPending}
                className="text-[12.5px] px-4 py-1.5 rounded transition-opacity disabled:opacity-50"
                style={{
                  color: 'oklch(99% 0 0)',
                  background: 'oklch(48% 0.16 160)',
                  fontWeight: 600,
                }}
              >
                {busy === c.id ? '처리 중…' : '승인'}
              </button>
              <button
                type="button"
                onClick={() => act(c.id, 'reject')}
                disabled={busy === c.id || isPending}
                className="text-[12.5px] px-4 py-1.5 rounded border transition-opacity disabled:opacity-50"
                style={{
                  color: 'var(--color-fg-muted)',
                  borderColor: 'var(--color-line-strong)',
                }}
              >
                거절
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
