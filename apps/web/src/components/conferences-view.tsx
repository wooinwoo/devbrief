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

function monthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
}

function formatDate(iso: string, end?: string): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  const s = new Date(iso);
  if (!end || end === iso) return fmt(s);
  return `${fmt(s)} ~ ${fmt(new Date(end))}`;
}

interface MonthGroup {
  label: string;
  conferences: ConferenceDto[];
}

function groupByMonth(list: ConferenceDto[]): MonthGroup[] {
  const map = new Map<string, ConferenceDto[]>();
  for (const c of list) {
    const k = monthKey(c.startDate);
    const arr = map.get(k) ?? [];
    arr.push(c);
    map.set(k, arr);
  }
  return [...map.entries()].map(([label, conferences]) => ({ label, conferences }));
}

export function ConferencesView({ conferences }: Props) {
  const upcoming = conferences
    .filter((c) => daysUntil(c.startDate) >= -1)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const past = conferences
    .filter((c) => daysUntil(c.startDate) < -1)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const upcomingGroups = groupByMonth(upcoming);

  return (
    <div>
      {/* 다가오는 */}
      {upcomingGroups.length === 0 ? (
        <p
          className="text-sm py-12 text-center"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          예정된 컨퍼런스가 없어요.
        </p>
      ) : (
        upcomingGroups.map((group, gi) => (
          <motion.section
            key={group.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: gi * 0.06 }}
            className="mb-14"
          >
            <div className="flex items-baseline gap-3 mb-7">
              <h2
                className="text-[12px] tracking-[0.2em] uppercase"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                {group.label}
              </h2>
              <span
                className="text-[11px]"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                {group.conferences.length}
              </span>
              <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
            </div>

            <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 items-start">
              {group.conferences.map((c) => {
                const d = daysUntil(c.startDate);
                const isNear = d <= 30;
                const isOngoing = d <= 0 && d >= -2;
                return (
                  <li key={c.id}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group relative pl-5"
                    >
                      <span
                        aria-hidden
                        className="absolute left-0 top-0.5 bottom-0.5 w-[2px]"
                        style={{
                          background: isNear
                            ? 'linear-gradient(to bottom, var(--color-warm), transparent 80%)'
                            : 'var(--color-line-strong)',
                          boxShadow: isNear ? '0 0 8px var(--color-warm)' : 'none',
                        }}
                      />
                      <div className="flex items-center gap-2 mb-2 text-[12px]">
                        <span
                          className="tabular-nums tracking-wide"
                          style={{
                            color: isNear ? 'var(--color-warm)' : 'var(--color-fg-muted)',
                          }}
                        >
                          {isOngoing ? '진행 중' : d === 0 ? '오늘' : `D-${d}`}
                        </span>
                        <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                        <span style={{ color: 'var(--color-fg-muted)' }}>
                          {formatDate(c.startDate, c.endDate)}
                        </span>
                      </div>
                      <h3
                        className="text-[1.0625rem] leading-snug tracking-[-0.005em] transition-colors"
                        style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}
                      >
                        <span className="group-hover:text-(--color-fg-strong)">{c.name}</span>
                      </h3>
                      <p
                        className="text-[12px] mt-1"
                        style={{ color: 'var(--color-fg-subtle)' }}
                      >
                        {c.location}
                      </p>
                      {c.description && (
                        <p
                          className="text-[13px] mt-2 leading-relaxed"
                          style={{ color: 'var(--color-fg-muted)' }}
                        >
                          {c.description}
                        </p>
                      )}
                      {c.topics.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                          {c.topics.slice(0, 4).map((t) => (
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
        ))
      )}

      {/* 지난 */}
      {past.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-6">
            <h2
              className="text-[12px] tracking-[0.2em] uppercase"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              지난 컨퍼런스
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
              {past.length}
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
          </div>
          <ul className="space-y-3">
            {past.map((c) => (
              <li key={c.id}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group flex items-baseline gap-4 py-2"
                >
                  <span
                    className="text-[11px] tabular-nums"
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    {formatDate(c.startDate, c.endDate)}
                  </span>
                  <span
                    className="text-[13px] transition-colors"
                    style={{ color: 'var(--color-fg-muted)' }}
                  >
                    <span className="group-hover:text-(--color-fg-strong) transition-colors">
                      {c.name}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
