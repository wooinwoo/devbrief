'use client';

import { motion } from 'motion/react';
import { SourceRing } from './source-ring';

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
  sources,
  topTags,
  onTagClick,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      className="relative mb-14 grid gap-10 md:grid-cols-[1fr_auto] md:items-start"
    >
      <div>
        <div
          className="inline-flex items-center gap-2 text-[13px] mb-6 tracking-wide"
          style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
        >
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full pulse-bar"
            style={{ background: 'var(--color-accent)', boxShadow: '0 0 10px var(--color-accent)' }}
          />
          <span>오늘 9시 자동 수집됨</span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span>마지막 갱신 방금</span>
        </div>

        <div className="grid grid-cols-3 gap-x-8 max-w-md mb-7">
          <Stat label="글" value={total} tone="oklch(50% 0.16 250)" />
          <Stat label="소스" value={sourceCount} tone="oklch(50% 0.18 290)" />
          <Stat label="안 본 글" value={unread} tone="oklch(50% 0.18 195)" />
        </div>

        {topTags.length > 0 && (
          <div>
            <p
              className="text-[12px] mb-3 tracking-[0.2em] uppercase"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
            >
              이번 주 자주 등장한 키워드
            </p>
            <div className="flex flex-wrap gap-2">
              {topTags.map(({ tag, count }, i) => {
                const palette = [
                  'oklch(50% 0.18 195)',
                  'oklch(52% 0.19 60)',
                  'oklch(50% 0.18 290)',
                  'oklch(50% 0.16 145)',
                  'oklch(52% 0.20 15)',
                  'oklch(50% 0.18 240)',
                  'oklch(52% 0.20 340)',
                  'oklch(50% 0.16 80)',
                ];
                const tone = palette[i % palette.length]!;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onTagClick?.(tag)}
                    className="text-[13px] px-3.5 py-1.5 rounded-full transition-all"
                    style={{
                      color: tone,
                      background: tone.replace(')', ' / 0.06)'),
                      border: `1px solid ${tone.replace(')', ' / 0.25)')}`,
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      #{tag}{' '}
                      <span style={{ color: tone.replace(')', ' / 0.65)') }}>{count}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <aside className="hidden md:block">
        <SourceRing sources={sources} total={total} />
      </aside>
    </motion.section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <p
        className="text-[12px] mb-1.5 tracking-[0.18em] uppercase"
        style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
      >
        {label}
      </p>
      <p
        className="text-[2rem] leading-none tabular-nums tracking-[-0.02em]"
        style={{
          color: tone,
          fontWeight: 600,
        }}
      >
        {value}
      </p>
    </div>
  );
}
