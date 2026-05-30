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

  const [first, second, ...rest] = upcoming;
  const midPair = rest.slice(0, 2);
  const tail = rest.slice(2);

  return (
    <div>
      {first && <HeroConference c={first} direction="left" tag="가장 가까운 일정" />}

      {second && <HeroConference c={second} direction="right" tag="그 다음" />}

      {midPair.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline gap-3 mb-7">
            <h2
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
            >
              이번 분기
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
              {midPair.length}
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
          </div>
          <ul className="grid gap-6 md:grid-cols-2 items-start">
            {midPair.map((c, i) => (
              <li key={c.id}>
                <MidCard c={c} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tail.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline gap-3 mb-5">
            <h2
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
            >
              그 이후
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
              {tail.length}
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
          </div>
          <ul>
            {tail.map((c, i) => (
              <li key={c.id}>
                <TailRow c={c} index={i} />
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

function HeroConference({
  c,
  direction,
  tag,
}: {
  c: ConferenceDto;
  direction: 'left' | 'right';
  tag: string;
}) {
  const d = daysUntil(c.startDate);
  const isOngoing = d <= 0 && d >= -2;
  const brand = c.brand ?? 'oklch(50% 0.012 245)';
  const dLabel = isOngoing ? '진행 중' : d === 0 ? '오늘' : `D-${d}`;

  const isLeft = direction === 'left';
  const heroSize = isLeft ? 'lg:text-[3.5rem]' : 'lg:text-[2.75rem]';
  const numSize = isLeft ? 'text-[6rem]' : 'text-[5rem]';
  const halo = isLeft
    ? `radial-gradient(ellipse 60% 50% at 30% 50%, ${brand.replace(')', ' / 0.12)')}, transparent 70%)`
    : `radial-gradient(ellipse 60% 50% at 70% 50%, ${brand.replace(')', ' / 0.10)')}, transparent 70%)`;

  const content = (
    <div className={isLeft ? '' : 'lg:text-right'}>
      <div
        className={`flex flex-wrap items-center gap-3 mb-5 text-[13px] ${isLeft ? '' : 'lg:justify-end'}`}
      >
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
        <span style={{ color: 'var(--color-fg-muted)' }}>{fmtWeekday(c.startDate)}</span>
        <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
        <span style={{ color: 'var(--color-fg-muted)' }}>{c.location}</span>
      </div>

      <h2
        className={`text-[2.25rem] sm:text-[3rem] ${heroSize} leading-[1.05] tracking-[-0.02em] transition-colors`}
        style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
      >
        <span className="group-hover:opacity-85">{c.name}</span>
      </h2>

      {c.description && (
        <p
          className={`text-[15px] sm:text-[16px] mt-4 leading-relaxed max-w-xl ${isLeft ? '' : 'lg:ml-auto'}`}
          style={{ color: 'var(--color-fg-default)' }}
        >
          {c.description}
        </p>
      )}

      {c.topics.length > 0 && (
        <div
          className={`mt-5 flex flex-wrap gap-x-3 gap-y-1.5 ${isLeft ? '' : 'lg:justify-end'}`}
        >
          {c.topics.slice(0, 5).map((t) => (
            <span key={t} className="text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const counter = (
    <div
      className="hidden lg:block relative w-[360px] xl:w-[420px] aspect-[4/5] shrink-0"
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: `0 24px 48px -16px ${brand.replace(')', ' / 0.25)')}`,
      }}
    >
      {c.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.image}
          alt={c.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${brand}, ${brand.replace(')', ' / 0.5)')} 60%, oklch(20% 0.01 245) 100%)`,
          }}
        />
      )}

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, ${brand.replace(')', ' / 0.55)')} 0%, transparent 60%)`,
        }}
      />

      <div className="absolute inset-0 p-7 flex flex-col justify-between text-white">
        <span
          className="text-[10px] tracking-[0.25em] uppercase"
          style={{ color: 'oklch(95% 0 0 / 0.8)', fontWeight: 500 }}
        >
          남은 일수
        </span>
        <div>
          <p
            className="leading-none tabular-nums tracking-[-0.04em]"
            style={{
              fontSize: '6rem',
              fontWeight: 700,
              color: 'oklch(99% 0 0)',
              textShadow: '0 4px 24px oklch(0% 0 0 / 0.4)',
            }}
          >
            {isOngoing ? '·' : d}
          </p>
          {!isOngoing && (
            <p
              className="text-[13px] mt-2"
              style={{ color: 'oklch(96% 0 0 / 0.92)' }}
            >
              일 남음
            </p>
          )}
        </div>
      </div>
    </div>
  );

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
        style={{ background: halo }}
      />

      <p
        className={`text-[11px] mb-4 tracking-[0.25em] uppercase ${isLeft ? '' : 'lg:text-right'}`}
        style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
      >
        {tag}
      </p>

      <a
        href={c.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block relative ${isLeft ? 'pl-6' : 'pr-6'}`}
      >
        <span
          aria-hidden
          className={`absolute top-2 bottom-2 w-1 ${isLeft ? 'left-0' : 'right-0'}`}
          style={{
            background: `linear-gradient(to bottom, ${brand}, transparent 90%)`,
            boxShadow: `0 0 16px ${brand}`,
            borderRadius: 4,
          }}
        />

        <div
          className={`grid gap-8 lg:gap-12 items-start ${
            isLeft ? 'lg:grid-cols-[1fr_auto]' : 'lg:grid-cols-[auto_1fr]'
          }`}
        >
          {isLeft ? (
            <>
              {content}
              {counter}
            </>
          ) : (
            <>
              {counter}
              {content}
            </>
          )}
        </div>
      </a>
    </motion.section>
  );
}

function MidCard({ c, index }: { c: ConferenceDto; index: number }) {
  const d = daysUntil(c.startDate);
  const brand = c.brand ?? 'oklch(50% 0.012 245)';
  const isNear = d <= 90;

  return (
    <motion.a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1], delay: 0.06 + index * 0.05 }}
      className="group relative block overflow-hidden transition-all motion-safe:hover:-translate-y-0.5"
      style={{
        borderRadius: 14,
        border: '1px solid var(--color-line)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      {/* 카드 상단 이미지 */}
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${brand}, ${brand.replace(')', ' / 0.5)')})`,
        }}
      >
        {c.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.image}
            alt={c.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${brand.replace(')', ' / 0.50)')} 0%, transparent 55%)`,
          }}
        />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <span
            className="text-[10px] tracking-[0.25em] uppercase"
            style={{ color: 'oklch(96% 0 0 / 0.92)', fontWeight: 500 }}
          >
            남은 일수
          </span>
          <span
            className="text-[2.75rem] leading-none tabular-nums tracking-[-0.03em]"
            style={{
              fontWeight: 700,
              color: 'oklch(99% 0 0)',
              textShadow: '0 2px 12px oklch(0% 0 0 / 0.4)',
            }}
          >
            {d}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3 text-[12px]">
            <span style={{ color: 'var(--color-fg-default)' }}>
              {formatDate(c.startDate, c.endDate)}
            </span>
            <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
            <span style={{ color: 'var(--color-fg-muted)' }}>{fmtWeekday(c.startDate)}</span>
          </div>

          <h3
            className="text-[1.5rem] sm:text-[1.75rem] leading-[1.15] tracking-[-0.01em] transition-colors"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
          >
            {c.name}
          </h3>
          <p className="text-[13px] mt-2" style={{ color: 'var(--color-fg-muted)' }}>
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
        </div>
      </div>
    </motion.a>
  );
}

function TailRow({ c, index }: { c: ConferenceDto; index: number }) {
  const d = daysUntil(c.startDate);
  const brand = c.brand ?? 'oklch(50% 0.012 245)';

  return (
    <motion.a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1], delay: 0.04 + index * 0.03 }}
      className="group grid grid-cols-[auto_auto_1fr_auto] gap-5 items-center py-4 transition-colors"
      style={{ borderBottom: '1px solid var(--color-line)' }}
    >
      <div
        className="relative w-20 h-14 shrink-0 overflow-hidden"
        style={{
          borderRadius: 8,
          background: `linear-gradient(135deg, ${brand}, ${brand.replace(')', ' / 0.5)')})`,
        }}
      >
        {c.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.image}
            alt={c.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>

      <span
        className="text-[1.75rem] tabular-nums leading-none tracking-tight w-16 text-right"
        style={{ color: brand, fontWeight: 600 }}
      >
        {d}
      </span>

      <div className="min-w-0">
        <h3
          className="text-[1.0625rem] tracking-[-0.005em] transition-colors leading-tight"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
        >
          {c.name}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-[12px]">
          <span style={{ color: 'var(--color-fg-muted)' }}>
            {formatDate(c.startDate, c.endDate)}
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>{c.location}</span>
          {c.topics.length > 0 && (
            <>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--color-fg-subtle)' }}>
                {c.topics.slice(0, 3).map((t) => `#${t}`).join(' ')}
              </span>
            </>
          )}
        </div>
      </div>

      <span
        className="text-[12px] transition-colors"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        <span className="group-hover:text-(--color-fg-default)">바로가기 →</span>
      </span>
    </motion.a>
  );
}
