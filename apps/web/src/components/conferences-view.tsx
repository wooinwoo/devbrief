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

function formatDate(iso: string, end?: string): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  const s = new Date(iso);
  if (!end || end === iso) return fmt(s);
  return `${fmt(s)} ~ ${fmt(new Date(end))}`;
}

function fmtWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { weekday: 'long' });
}

export function ConferencesView({ conferences }: Props) {
  const upcoming = conferences
    .filter((c) => daysUntil(c.startDate) >= -1)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const past = conferences
    .filter((c) => daysUntil(c.startDate) < -1)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const [hero, ...rest] = upcoming;

  return (
    <div>
      {hero && <HeroConference c={hero} />}

      {rest.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline gap-3 mb-7">
            <h2
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
            >
              다음 일정
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
              {rest.length}
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
          </div>

          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
            {rest.map((c, i) => (
              <li key={c.id}>
                <UpcomingCard c={c} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-6">
            <h2
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
            >
              지난 컨퍼런스
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
              {past.length}
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
          </div>
          <ul className="space-y-1">
            {past.map((c) => (
              <li key={c.id}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-baseline gap-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--color-line)' }}
                >
                  <span
                    className="text-[12px] tabular-nums shrink-0 w-24"
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    {formatDate(c.startDate, c.endDate)}
                  </span>
                  <span
                    className="text-[14px] transition-colors"
                    style={{ color: 'var(--color-fg-muted)' }}
                  >
                    <span className="group-hover:text-(--color-fg-strong)">{c.name}</span>
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

function HeroConference({ c }: { c: ConferenceDto }) {
  const d = daysUntil(c.startDate);
  const isOngoing = d <= 0 && d >= -2;
  const brand = c.brand ?? 'oklch(50% 0.012 245)';
  const dLabel = isOngoing ? '진행 중' : d === 0 ? '오늘' : `D-${d}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      className="relative mb-16"
    >
      <div
        aria-hidden
        className="absolute -inset-6 lg:-inset-10 -z-10 blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 30% 50%, ${brand.replace(')', ' / 0.12)')}, transparent 70%)`,
        }}
      />

      <p
        className="text-[11px] mb-4 tracking-[0.25em] uppercase"
        style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
      >
        가장 가까운 일정
      </p>

      <a
        href={c.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block relative pl-6"
      >
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-1"
          style={{
            background: `linear-gradient(to bottom, ${brand}, transparent 90%)`,
            boxShadow: `0 0 16px ${brand}`,
            borderRadius: 4,
          }}
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_auto] items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-5 text-[13px]">
              <span
                className="px-3 py-1 rounded-full tabular-nums"
                style={{
                  background: brand.replace(')', ' / 0.12)'),
                  color: brand,
                  border: `1px solid ${brand.replace(')', ' / 0.3)')}`,
                  fontWeight: 600,
                }}
              >
                {dLabel}
              </span>
              <span style={{ color: 'var(--color-fg-default)' }}>
                {formatDate(c.startDate, c.endDate)}
              </span>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>
                {fmtWeekday(c.startDate)}
              </span>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>{c.location}</span>
            </div>

            <h2
              className="text-[2.25rem] sm:text-[3rem] lg:text-[3.5rem] leading-[1.05] tracking-[-0.02em] transition-colors"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
            >
              <span className="group-hover:opacity-85">{c.name}</span>
            </h2>

            {c.description && (
              <p
                className="text-[15px] sm:text-[16px] mt-4 leading-relaxed max-w-xl"
                style={{ color: 'var(--color-fg-default)' }}
              >
                {c.description}
              </p>
            )}

            {c.topics.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1.5">
                {c.topics.slice(0, 5).map((t) => (
                  <span
                    key={t}
                    className="text-[13px]"
                    style={{ color: 'var(--color-fg-muted)' }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:flex flex-col items-end justify-start pt-2">
            <p
              className="text-[10px] mb-2 tracking-[0.25em] uppercase"
              style={{ color: 'var(--color-fg-subtle)', fontWeight: 500 }}
            >
              남은 일수
            </p>
            <p
              className="text-[6rem] leading-none tabular-nums tracking-[-0.04em]"
              style={{ color: brand, fontWeight: 600 }}
            >
              {isOngoing ? '·' : d}
            </p>
            {!isOngoing && (
              <p
                className="text-[12px] mt-1"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                일
              </p>
            )}
          </div>
        </div>
      </a>
    </motion.section>
  );
}

function UpcomingCard({ c, index }: { c: ConferenceDto; index: number }) {
  const d = daysUntil(c.startDate);
  const isNear = d <= 60;
  const brand = c.brand ?? 'oklch(50% 0.012 245)';

  return (
    <motion.a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: [0.2, 0, 0, 1],
        delay: 0.06 + index * 0.04,
      }}
      className="group relative block p-5 transition-all motion-safe:hover:-translate-y-0.5"
      style={{
        borderRadius: 12,
        border: '1px solid var(--color-line)',
        background: isNear
          ? `linear-gradient(135deg, ${brand.replace(')', ' / 0.07)')}, var(--color-bg-elevated) 60%)`
          : 'var(--color-bg-elevated)',
        minHeight: 200,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <span
          className="text-[12px] tabular-nums px-2.5 py-1 rounded-full"
          style={{
            background: isNear ? brand.replace(')', ' / 0.12)') : 'transparent',
            color: isNear ? brand : 'var(--color-fg-muted)',
            border: `1px solid ${isNear ? brand.replace(')', ' / 0.3)') : 'var(--color-line-strong)'}`,
            fontWeight: 600,
          }}
        >
          D-{d}
        </span>
        <span
          className="text-[11px] tabular-nums"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          {formatDate(c.startDate, c.endDate)}
        </span>
      </div>

      <h3
        className="text-[1.125rem] leading-snug tracking-[-0.005em] transition-colors"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
      >
        {c.name}
      </h3>
      <p
        className="text-[12.5px] mt-1.5"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {c.location}
      </p>

      {c.description && (
        <p
          className="text-[13px] mt-3 leading-relaxed"
          style={{
            color: 'var(--color-fg-default)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {c.description}
        </p>
      )}

      {c.topics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-2.5 gap-y-1">
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
    </motion.a>
  );
}
