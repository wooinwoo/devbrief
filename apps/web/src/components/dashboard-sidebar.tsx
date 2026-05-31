'use client';

import Link from 'next/link';
import { formatDuration } from '@/lib/format-duration';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { VideoDto } from '@/lib/mock-videos';

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface Props {
  conferences: ConferenceDto[];
  videos: VideoDto[];
  topTags: Array<{ tag: string; count: number }>;
  onTagClick?: (tag: string) => void;
  activeTag?: string;
}

export function DashboardSidebar({
  conferences,
  videos,
  topTags,
  onTagClick,
  activeTag,
}: Props) {
  const upcoming = conferences
    .filter((c) => daysUntil(c.startDate) >= 0)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )
    .slice(0, 4);

  return (
    <aside className="flex flex-col gap-8 text-[13px]">
      {/* 트렌드 단어 */}
      {topTags.length > 0 && (
        <section>
          <h3
            className="text-[10px] tracking-[0.22em] uppercase mb-3"
            style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
          >
            트렌드 · {topTags.length}
          </h3>
          <div className="flex flex-wrap gap-x-2 gap-y-1.5">
            {topTags.map(({ tag, count }) => {
              const isActive = tag === activeTag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className="text-[12.5px] transition-colors"
                  style={{
                    color: isActive
                      ? 'var(--color-fg-strong)'
                      : 'var(--color-fg-muted)',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  <span className="hover:text-(--color-fg-default)">#{tag}</span>
                  <sup
                    className="ml-0.5 tabular-nums"
                    style={{
                      fontSize: '0.7em',
                      color: 'var(--color-fg-subtle)',
                      fontWeight: 500,
                    }}
                  >
                    {count}
                  </sup>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 곧 열리는 컨퍼런스 */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h3
              className="text-[10px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
            >
              곧 열림
            </h3>
            <Link
              href="/conferences"
              className="text-[11px] transition-colors"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              <span className="hover:text-(--color-fg-default)">전체 →</span>
            </Link>
          </div>
          <ul className="space-y-2">
            {upcoming.map((c) => {
              const d = daysUntil(c.startDate);
              const brand = c.brand ?? 'oklch(50% 0.012 245)';
              return (
                <li key={c.id}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-baseline gap-3"
                  >
                    <span
                      className="tabular-nums text-[12px] shrink-0 px-1.5 py-px"
                      style={{
                        background: brand,
                        color: 'oklch(99% 0 0)',
                        fontWeight: 600,
                        borderRadius: 2,
                        minWidth: 36,
                        textAlign: 'center',
                      }}
                    >
                      D-{d}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-[13px] tracking-[-0.005em] group-hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
                        style={{
                          color: 'var(--color-fg-strong)',
                          fontWeight: 600,
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        className="block truncate text-[11px]"
                        style={{ color: 'var(--color-fg-muted)' }}
                      >
                        {c.location}
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 이번 주 발표 */}
      {videos.length > 0 && (
        <section>
          <h3
            className="text-[10px] tracking-[0.22em] uppercase mb-3"
            style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
          >
            발표 영상 · {videos.length}
          </h3>
          <ul className="space-y-2.5">
            {videos.slice(0, 4).map((v) => (
              <li key={v.id}>
                <Link
                  href={`/videos/${v.id}`}
                  className="group flex items-baseline gap-3"
                >
                  <span
                    className="tabular-nums text-[11px] shrink-0 px-1.5 py-px"
                    style={{
                      color: 'var(--color-fg-muted)',
                      border: '1px solid var(--color-line-strong)',
                      borderRadius: 2,
                      minWidth: 44,
                      textAlign: 'center',
                      fontWeight: 600,
                    }}
                  >
                    {formatDuration(v.durationSec)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[13px] tracking-[-0.005em] group-hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
                      style={{
                        color: 'var(--color-fg-strong)',
                        fontWeight: 600,
                      }}
                    >
                      {v.title}
                    </span>
                    <span
                      className="block truncate text-[11px]"
                      style={{ color: 'var(--color-fg-muted)' }}
                    >
                      {v.channel}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
