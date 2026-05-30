'use client';

import { motion } from 'motion/react';

interface Props {
  total: number;
  unread: number;
  sourceCount: number;
  sources: Array<{ provider: string; name: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  onTagClick?: (tag: string) => void;
}

export function HeroStrip({
  total,
  unread,
  sourceCount,
  topTags,
  onTagClick,
}: Props) {
  const readPercent = total > 0 ? Math.round(((total - unread) / total) * 100) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      className="relative mb-20"
    >
      {/* 큰 수 + 짧은 카피 (잭 톤 박력) */}
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[auto_1fr] lg:items-end">
        <div>
          <p
            className="text-[13px] mb-3 tracking-wide"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            오늘 9시에 새 글{' '}
            <span style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}>
              {unread}
            </span>
            개가 들어왔어요.
          </p>
          <h2
            className="text-[2.25rem] sm:text-[3.25rem] md:text-[4rem] lg:text-[5rem] leading-[0.95] tracking-[-0.035em] break-keep"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            오늘은 무엇이
            <br />
            <span
              style={{
                background:
                  'linear-gradient(135deg, var(--color-accent), oklch(50% 0.18 60))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              궁금한가요?
            </span>
          </h2>
        </div>

        {/* 우측 미세 통계 */}
        <dl
          className="grid grid-cols-3 gap-x-10 gap-y-2 max-w-md lg:justify-self-end"
          style={{ borderLeft: '1px solid var(--color-line)' }}
        >
          <Stat label="전체" value={total} suffix="글" />
          <Stat label="소스" value={sourceCount} />
          <Stat label="진척" value={readPercent} suffix="%" />
        </dl>
      </div>

      {topTags.length > 0 && (
        <div className="mt-12">
          <p
            className="text-[12px] mb-3 tracking-[0.22em] uppercase"
            style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
          >
            지금 가장 많이 쓰인 단어 {topTags.length}개
          </p>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {topTags.map(({ tag, count }, i) => {
              const size = Math.max(0.95, Math.min(1.6, count / 2));
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className="transition-colors leading-none"
                  style={{
                    color:
                      i === 0
                        ? 'var(--color-fg-strong)'
                        : 'var(--color-fg-muted)',
                    fontSize: `${size}rem`,
                    fontWeight: i === 0 ? 700 : 500,
                    letterSpacing: '-0.01em',
                  }}
                >
                  <span className="hover:text-(--color-fg-strong) transition-colors">
                    {tag}
                  </span>
                  <sup
                    className="ml-0.5 tabular-nums"
                    style={{
                      fontSize: '0.55em',
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
        </div>
      )}
    </motion.section>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="pl-6">
      <dt
        className="text-[11px] mb-1 tracking-[0.18em] uppercase"
        style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
      >
        {label}
      </dt>
      <dd
        className="text-[1.25rem] leading-none tabular-nums tracking-[-0.02em] flex items-baseline gap-0.5"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
      >
        {value}
        {suffix && (
          <span
            className="text-[12px] ml-0.5"
            style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
          >
            {suffix}
          </span>
        )}
      </dd>
    </div>
  );
}
