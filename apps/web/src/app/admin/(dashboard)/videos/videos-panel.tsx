'use client';

import { formatVideoDuration } from '@/lib/format-duration';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export interface AdminVideo {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  durationSec: number;
  views: number;
  chapterSource: 'official' | 'description' | 'ai' | null;
  summary: string | null;
  analyzedAt: string | null;
}

import { adminFetch } from '@/lib/api';
import { ensureOk } from '../ensure-ok';

const SOURCE_KO: Record<string, string> = {
  official: '유튜버 표시',
  description: '영상 설명',
  ai: 'AI 자동',
  none: '분석 불가', // 자막·설명 없어 영구 스킵된 영상 (video-analyzer 의 영구 빈 케이스 마커)
};

export function VideosPanel({ initialVideos }: { initialVideos: AdminVideo[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onAdd = async () => {
    if (!url.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await adminFetch('/videos/add', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      await ensureOk(res, '영상 추가');
      setUrl('');
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('이 영상을 삭제할까요?')) return;
    setBusy(id);
    setError(null);
    try {
      const res = await adminFetch(`/videos/${id}`, { method: 'DELETE' });
      // 실패(401/404/500)를 무피드백 refresh 로 삼키지 않게 검사한다.
      await ensureOk(res, '영상 삭제');
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {/* 추가 패널 */}
      <section className="py-6 mb-8 border-y" style={{ borderColor: 'var(--color-line)' }}>
        <h2
          className="text-[18px] tracking-[-0.015em] mb-4"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          영상 추가
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            placeholder="https://www.youtube.com/watch?v=..."
            aria-label="YouTube 영상 URL"
            className="min-w-0 flex-1 min-h-11 px-3 py-2 text-[16px] outline-none border rounded focus:border-(--color-accent) transition-colors"
            style={{ borderColor: 'var(--color-line-strong)' }}
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={!url.trim() || adding}
            className="min-h-11 px-4 py-2 text-[14px] rounded transition-opacity disabled:opacity-50"
            style={{
              background: 'var(--color-fg-strong)',
              color: 'oklch(99% 0 0)',
              fontWeight: 600,
            }}
          >
            {adding ? '가져오는 중…' : '추가'}
          </button>
        </div>
        {error && (
          <p className="mt-2.5 text-[12px]" style={{ color: 'oklch(55% 0.2 25)' }}>
            오류: {error}
          </p>
        )}
        <p className="mt-2.5 text-[13px]" style={{ color: 'var(--color-fg-subtle)' }}>
          watch / youtu.be / shorts / live URL 모두 지원. 추가 후 챕터/요약은 백그라운드에서
          분석됩니다 (몇 초 후 새로고침).
        </p>
      </section>

      {/* 목록 */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[14px]" style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}>
          등록된 영상
        </span>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--color-fg-subtle)' }}>
          {initialVideos.length}
        </span>
      </div>

      {initialVideos.length === 0 ? (
        <p className="py-10 text-center text-[14px]" style={{ color: 'var(--color-fg-muted)' }}>
          등록된 영상이 없어요. 위에 URL 을 붙여넣어 추가하세요.
        </p>
      ) : (
        <ul className="flex flex-col">
          {initialVideos.map((v) => (
            <li
              key={v.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex gap-4 items-start py-5 border-b"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div
                className="col-span-2 sm:col-span-1 relative shrink-0 w-full sm:w-32 aspect-video overflow-hidden rounded"
                style={{ background: 'oklch(92% 0.01 290)' }}
              >
                {v.thumbnailUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <span
                  className="absolute bottom-1 right-1 px-1 py-px text-[10px] tabular-nums"
                  style={{
                    background: 'oklch(0% 0 0 / 0.78)',
                    color: 'oklch(99% 0 0)',
                    borderRadius: 2,
                    fontWeight: 600,
                  }}
                >
                  {formatVideoDuration(v.durationSec)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className="text-[13px] mb-0.5"
                  style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
                >
                  {v.channel}
                </div>
                <a
                  href={`/videos/${v.id}`}
                  className="block text-[14px] leading-snug tracking-[-0.005em] hover:underline underline-offset-2"
                  style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
                >
                  {v.title}
                </a>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px]">
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      background: v.analyzedAt
                        ? 'oklch(80% 0.15 160 / 0.15)'
                        : 'var(--color-bg-sunken)',
                      color: v.analyzedAt ? 'oklch(45% 0.16 160)' : 'var(--color-fg-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {v.analyzedAt
                      ? `분석됨${v.chapterSource ? ` · ${SOURCE_KO[v.chapterSource]}` : ''}`
                      : '분석 대기'}
                  </span>
                  {v.summary && <span style={{ color: 'var(--color-fg-subtle)' }}>요약 있음</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(v.id)}
                disabled={busy === v.id || isPending}
                className="shrink-0 min-h-11 min-w-11 text-[12px] transition-opacity disabled:opacity-50"
                style={{ color: 'oklch(55% 0.2 25)' }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
