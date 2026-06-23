'use client';

import { daysUntil } from '@/lib/date-utils';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { VideoDto } from '@/lib/mock-videos';
import Link from 'next/link';

function fmtViews(n: number): string {
  if (n >= 10000) return `${Math.round(n / 10000)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return `${n}`;
}

interface Props {
  conferences: ConferenceDto[];
  videos: VideoDto[];
  onNavigate: (tab: 'conferences' | 'videos') => void;
}

/** 사이드바 하단 보조 위젯 — 빈 공간 활용 + 다른 콘텐츠 발견성. 데스크탑 전용. */
export function SidebarWidgets({ conferences, videos, onNavigate }: Props) {
  const upcoming = conferences
    .filter((c) => daysUntil(c.startDate) >= 0)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);
  const vids = videos.slice(0, 2);

  if (upcoming.length === 0 && vids.length === 0) return null;

  return (
    <div
      className="hidden lg:flex flex-col gap-6 pt-6 mt-1 border-t"
      style={{ borderColor: 'var(--color-line)' }}
    >
      {upcoming.length > 0 && (
        <section>
          <WidgetHeader label="다가오는 컨퍼런스" onMore={() => onNavigate('conferences')} />
          <ul className="flex flex-col gap-2">
            {upcoming.map((c) => {
              const d = daysUntil(c.startDate);
              const brand = c.brand ?? 'var(--color-accent)';
              return (
                <li key={c.id}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2"
                  >
                    <span
                      className="shrink-0 tabular-nums text-[10.5px] px-1.5 py-0.5 rounded mt-0.5"
                      style={{ background: brand, color: 'oklch(99% 0 0)', fontWeight: 700 }}
                    >
                      D-{d}
                    </span>
                    <span
                      className="text-[12.5px] leading-[1.35] line-clamp-2 group-hover:text-(--color-fg-strong) transition-colors"
                      style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
                    >
                      {c.name}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {vids.length > 0 && (
        <section>
          <WidgetHeader label="발표 영상" onMore={() => onNavigate('videos')} />
          <ul className="flex flex-col gap-3">
            {vids.map((v) => (
              <li key={v.id}>
                <Link href={`/videos/${v.id}`} className="group flex gap-2.5 items-start">
                  <div
                    className="relative w-[68px] aspect-video shrink-0 overflow-hidden"
                    style={{ borderRadius: 5, background: 'oklch(90% 0.01 290)' }}
                  >
                    {v.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[12px] leading-[1.3] line-clamp-2 group-hover:text-(--color-fg-strong) transition-colors"
                      style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
                    >
                      {v.title}
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--color-fg-subtle)' }}>
                      {v.channel} · 조회 {fmtViews(v.views)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function WidgetHeader({ label, onMore }: { label: string; onMore: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span
        aria-hidden
        className="inline-block w-0.5 h-3.5 rounded-full"
        style={{ background: 'var(--color-accent)' }}
      />
      <span
        className="text-[11px] tracking-[-0.005em]"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
      >
        {label}
      </span>
      <span className="flex-1" />
      <button
        type="button"
        onClick={onMore}
        aria-label={`${label} 더 보기`}
        className="text-[10.5px] transition-colors hover:text-(--color-accent-strong)"
        style={{ color: 'var(--color-accent)', fontWeight: 600 }}
      >
        더 보기 →
      </button>
    </div>
  );
}
