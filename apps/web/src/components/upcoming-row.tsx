'use client';

import { type ConferenceDto, MOCK_CONFERENCES } from '@/lib/mock-conferences';
import { motion } from 'motion/react';
import Link from 'next/link';

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string, end?: string | null): string {
  const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  const s = new Date(iso);
  if (!end || end === iso) return fmt(s);
  return `${fmt(s)} ~ ${fmt(new Date(end))}`;
}

interface Props {
  conferences?: ConferenceDto[];
}

export function UpcomingRow({ conferences }: Props = {}) {
  const list = conferences && conferences.length > 0 ? conferences : MOCK_CONFERENCES;
  const upcoming = list
    .filter((c) => daysUntil(c.startDate) >= 0)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className="mb-20"
    >
      <div
        className="flex items-end justify-between mb-7 pb-4 border-b"
        style={{ borderColor: 'var(--color-line)' }}
      >
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
                {/* brand 색 박스 + 잡지 매거진 1면 톤 */}
                <div
                  className="relative aspect-[16/10] overflow-hidden mb-4 flex flex-col justify-between p-5"
                  style={{
                    borderRadius: 4,
                    background: brand,
                  }}
                >
                  {/* 좌상단 D-day 라벨 + 날짜 */}
                  <div>
                    <div
                      className="text-[10px] tracking-[0.25em] uppercase mb-1"
                      style={{ color: 'oklch(99% 0 0 / 0.65)', fontWeight: 500 }}
                    >
                      D-{d}
                    </div>
                    <div
                      className="text-[12px] tabular-nums"
                      style={{ color: 'oklch(99% 0 0 / 0.85)', fontWeight: 500 }}
                    >
                      {formatDate(c.startDate, c.endDate)}
                    </div>
                  </div>

                  {/* 우하단 큰 D-day 숫자 */}
                  <div
                    className="self-end leading-none tabular-nums tracking-[-0.04em]"
                    style={{
                      fontSize: '4rem',
                      fontWeight: 700,
                      color: 'oklch(99% 0 0)',
                    }}
                  >
                    {d}
                  </div>

                  {/* 우상단 topic 작게 */}
                  {c.topics.length > 0 && (
                    <div className="absolute top-5 right-5 flex flex-wrap justify-end gap-1.5 max-w-[55%]">
                      {c.topics.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 tracking-wide"
                          style={{
                            background: 'oklch(99% 0 0 / 0.15)',
                            color: 'oklch(99% 0 0 / 0.9)',
                            borderRadius: 2,
                            fontWeight: 500,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
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
