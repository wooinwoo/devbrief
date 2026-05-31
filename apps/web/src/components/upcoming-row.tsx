'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { MOCK_CONFERENCES, type ConferenceDto } from '@/lib/mock-conferences';

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string, end?: string | null): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  const s = new Date(iso);
  if (!end || end === iso) return fmt(s);
  return `${fmt(s)} ~ ${fmt(new Date(end))}`;
}

interface Props {
  conferences?: ConferenceDto[];
}

export function UpcomingRow({ conferences }: Props = {}) {
  const list =
    conferences && conferences.length > 0 ? conferences : MOCK_CONFERENCES;
  const upcoming = list
    .filter((c) => daysUntil(c.startDate) >= 0)
    .sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className="mb-20"
    >
      <div className="flex items-end justify-between mb-7 pb-4 border-b" style={{ borderColor: 'var(--color-line)' }}>
        <div>
          <h2
            className="text-[1.5rem] sm:text-[2.125rem] leading-none tracking-[-0.025em] break-keep"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            곧 열리는 컨퍼런스
          </h2>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            앞으로 두 달 안에{' '}
            <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
              {upcoming.length}
            </span>
            개 예정.
          </p>
        </div>
        <Link
          href="/conferences"
          className="text-[13px] transition-colors pb-1"
          style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
        >
          <span className="hover:text-(--color-fg-strong)">전체 →</span>
        </Link>
      </div>

      <ul
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 sm:-mx-10 sm:px-10 lg:-mx-16 lg:px-16 xl:-mx-24 xl:px-24"
        style={{ scrollbarWidth: 'thin' }}
      >
        {upcoming.map((c, i) => {
          const d = daysUntil(c.startDate);
          const brand = c.brand ?? 'oklch(50% 0.012 245)';
          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                ease: [0.2, 0, 0, 1],
                delay: 0.06 + i * 0.04,
              }}
              className="snap-start shrink-0 w-[280px] sm:w-[320px]"
            >
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block transition-all motion-safe:hover:-translate-y-0.5"
              >
                {/* 이미지 대신 brand 색 + 큰 D-day 타이포 */}
                <div
                  className="relative aspect-[16/10] overflow-hidden mb-4 flex flex-col justify-between p-5"
                  style={{
                    borderRadius: 4,
                    background: brand,
                  }}
                >
                  <span
                    className="text-[11px] tracking-[0.25em] uppercase"
                    style={{ color: 'oklch(99% 0 0 / 0.7)', fontWeight: 500 }}
                  >
                    D-{d}
                  </span>
                  <div className="flex items-end justify-between">
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ color: 'oklch(99% 0 0 / 0.7)' }}
                    >
                      {formatDate(c.startDate, c.endDate)}
                    </span>
                    <span
                      className="text-[3.5rem] leading-none tabular-nums tracking-[-0.04em]"
                      style={{
                        fontWeight: 700,
                        color: 'oklch(99% 0 0)',
                      }}
                    >
                      {d}
                    </span>
                  </div>
                </div>
                <h3
                  className="text-[15px] leading-snug tracking-[-0.005em] transition-colors break-keep"
                  style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
                >
                  {c.name}
                </h3>
                <div className="mt-1.5 flex items-center gap-2 text-[12px]">
                  <span style={{ color: 'var(--color-fg-muted)' }}>{c.location}</span>
                </div>
              </a>
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}
