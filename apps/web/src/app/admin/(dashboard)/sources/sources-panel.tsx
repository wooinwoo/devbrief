'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface SourceDto {
  id: string;
  provider: string;
  name: string;
  feedUrl: string;
  homepage: string | null;
  language: string;
  active: boolean;
  createdAt: string;
}

interface DiscoveredFeed {
  feedUrl: string;
  title: string;
  type: 'rss' | 'atom';
}

import { API_BASE } from '@/lib/api';

export function SourcesPanel({
  initialSources,
}: {
  initialSources: SourceDto[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState('');
  const [discovered, setDiscovered] = useState<DiscoveredFeed[] | null>(null);
  const [registering, setRegistering] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDiscover = async () => {
    if (!url) return;
    setDiscovering(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sources/discover`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { feeds: DiscoveredFeed[] };
      setDiscovered(data.feeds ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDiscovering(false);
    }
  };

  const onRegister = async () => {
    if (!url) return;
    setRegistering(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sources/discover-and-register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as {
        created: number;
        existing: number;
      };
      setUrl('');
      setDiscovered(null);
      startTransition(() => router.refresh());
      alert(`새로 등록: ${data.created} / 이미 등록됨: ${data.existing}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegistering(false);
    }
  };

  const onToggle = async (id: string) => {
    setBusy(id);
    try {
      await fetch(`${API_BASE}/sources/${id}/toggle`, { method: 'PATCH' });
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    setBusy(id);
    try {
      await fetch(`${API_BASE}/sources/${id}`, { method: 'DELETE' });
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {/* 추가 패널 */}
      <section
        className="p-6 mb-10 border"
        style={{ borderColor: 'var(--color-line)', borderRadius: 4 }}
      >
        <h2
          className="text-[14px] tracking-[-0.005em] mb-4"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          새 소스 추가
        </h2>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://blog.example.com"
            className="flex-1 px-3 py-2 text-[13px] outline-none border rounded"
            style={{ borderColor: 'var(--color-line-strong)' }}
          />
          <button
            type="button"
            onClick={onDiscover}
            disabled={!url || discovering}
            className="px-4 py-2 text-[13px] rounded border transition-opacity disabled:opacity-50"
            style={{
              borderColor: 'var(--color-line-strong)',
              color: 'var(--color-fg-default)',
            }}
          >
            {discovering ? '탐색 중…' : '피드 찾기'}
          </button>
          <button
            type="button"
            onClick={onRegister}
            disabled={!url || registering}
            className="px-4 py-2 text-[13px] rounded transition-opacity disabled:opacity-50"
            style={{
              background: 'oklch(48% 0.16 160)',
              color: 'oklch(99% 0 0)',
              fontWeight: 600,
            }}
          >
            {registering ? '등록 중…' : '바로 등록'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-[12px]" style={{ color: 'oklch(50% 0.21 15)' }}>
            오류: {error}
          </p>
        )}
        {discovered && (
          <div className="mt-4">
            <p
              className="text-[11px] tracking-wide uppercase mb-2"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
            >
              발견된 피드 {discovered.length}개
            </p>
            {discovered.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: 'var(--color-fg-muted)' }}>
                이 URL 에서 RSS / Atom 피드를 찾지 못했어요.
              </p>
            ) : (
              <ul className="space-y-1">
                {discovered.map((f) => (
                  <li key={f.feedUrl} className="text-[12.5px] flex items-center gap-3">
                    <span
                      className="px-1.5 py-0.5 text-[10px] tracking-wide uppercase rounded"
                      style={{
                        color: 'var(--color-fg-muted)',
                        background: 'var(--color-bg-subtle)',
                      }}
                    >
                      {f.type}
                    </span>
                    <span style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}>
                      {f.title}
                    </span>
                    <span style={{ color: 'var(--color-fg-muted)' }}>{f.feedUrl}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* 등록된 목록 */}
      <section>
        <div
          className="flex items-baseline gap-3 mb-5 pb-3 border-b"
          style={{ borderColor: 'var(--color-line)' }}
        >
          <h2
            className="text-[15px] tracking-[-0.005em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
          >
            등록된 소스
          </h2>
          <span className="text-[12px] tabular-nums" style={{ color: 'var(--color-fg-subtle)' }}>
            {initialSources.length}
          </span>
        </div>
        <ul>
          {initialSources.map((s) => (
            <li
              key={s.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center py-3 border-b text-[13px]"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span
                    style={{
                      color: s.active ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded tracking-wide uppercase"
                    style={{
                      color: 'var(--color-fg-muted)',
                      background: 'var(--color-bg-subtle)',
                    }}
                  >
                    {s.language}
                  </span>
                </div>
                <span
                  className="text-[11.5px] block truncate"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {s.feedUrl}
                </span>
              </div>
              <span
                className="text-[11px] px-2 py-0.5 rounded"
                style={{
                  color: s.active ? 'oklch(48% 0.16 160)' : 'var(--color-fg-muted)',
                  background: s.active ? 'oklch(80% 0.15 160 / 0.15)' : 'var(--color-bg-subtle)',
                  fontWeight: 600,
                }}
              >
                {s.active ? '활성' : '비활성'}
              </span>
              <button
                type="button"
                onClick={() => onToggle(s.id)}
                disabled={busy === s.id || isPending}
                className="text-[12px] px-2.5 py-1 rounded border transition-opacity disabled:opacity-50"
                style={{
                  color: 'var(--color-fg-default)',
                  borderColor: 'var(--color-line-strong)',
                }}
              >
                {s.active ? '끄기' : '켜기'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                disabled={busy === s.id || isPending}
                className="text-[12px] transition-opacity disabled:opacity-50"
                style={{ color: 'oklch(50% 0.21 15)' }}
              >
                삭제
              </button>
            </li>
          ))}
          {initialSources.length === 0 && (
            <li className="py-6 text-center text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
              등록된 소스가 없어요. 위에서 URL 을 입력해 추가하세요.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
