'use client';

import { motion } from 'motion/react';
import type { ConferenceDto } from '@/lib/mock-conferences';

interface Props {
  conferences: ConferenceDto[];
}

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string, end?: string | null): string {
  const s = new Date(iso);
  const fmt = (d: Date) =>
    d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  if (!end || end === iso) return fmt(s);
  const e = new Date(end);
  return `${fmt(s)} ~ ${fmt(e)}`;
}

export function ConferenceSection({ conferences }: Props) {
  const upcoming = conferences
    .filter((c) => daysUntil(c.startDate) >= 0)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1], delay: 0.15 }}
      className="mb-16"
    >
      <div className="flex items-baseline gap-3 mb-6">
        <h3
          className="text-[11px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          다가오는 컨퍼런스
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
          {upcoming.length}
        </span>
        <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
      </div>

      <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 items-start">
        {upcoming.map((c) => {
          const d = daysUntil(c.startDate);
          const isNear = d <= 30;
          return (
            <li key={c.id}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group relative pl-4 py-1"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-1 bottom-1 w-px transition-opacity"
                  style={{
                    background: isNear
                      ? 'linear-gradient(to bottom, var(--color-warm), transparent 80%)'
                      : 'var(--color-line-strong)',
                    boxShadow: isNear ? '0 0 6px var(--color-warm)' : 'none',
                  }}
                />
                <div className="flex items-center gap-2 mb-1.5 text-[11px]">
                  <span
                    className="tabular-nums tracking-wide"
                    style={{ color: isNear ? 'var(--color-warm)' : 'var(--color-fg-muted)' }}
                  >
                    {d === 0 ? '오늘' : `D-${d}`}
                  </span>
                  <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                  <span style={{ color: 'var(--color-fg-muted)' }}>
                    {formatDate(c.startDate, c.endDate)}
                  </span>
                </div>
                <h4
                  className="text-[15px] leading-snug transition-colors"
                  style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}
                >
                  <span className="group-hover:text-(--color-fg-strong) transition-colors">
                    {c.name}
                  </span>
                </h4>
                <p
                  className="text-[12px] mt-1"
                  style={{ color: 'var(--color-fg-subtle)' }}
                >
                  {c.location}
                </p>
                {c.topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
                    {c.topics.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[11px]"
                        style={{ color: 'var(--color-fg-subtle)' }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
