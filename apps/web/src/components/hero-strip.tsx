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
          className="inline-flex items-center gap-2 text-[12px] mb-5 tracking-wide"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full pulse-bar"
            style={{ background: 'var(--color-accent)', boxShadow: '0 0 10px var(--color-accent)' }}
          />
          <span>오늘 9시 자동 수집됨</span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span>마지막 갱신 방금</span>
        </div>

        <div className="grid grid-cols-3 gap-x-8 max-w-md mb-7">
          <Stat label="글" value={total} />
          <Stat label="소스" value={sourceCount} />
          <Stat label="안 본 글" value={unread} accent />
        </div>

        {topTags.length > 0 && (
          <div>
            <p
              className="text-[11px] mb-2.5 tracking-[0.18em] uppercase"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              이번 주 자주 등장한 키워드
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className="text-[12px] px-3 py-1 rounded-full transition-all"
                  style={{
                    color: 'var(--color-fg-muted)',
                    border: '1px solid var(--color-line)',
                  }}
                >
                  <span className="hover:text-(--color-fg-strong) transition-colors">
                    #{tag} <span style={{ color: 'var(--color-fg-subtle)' }}>{count}</span>
                  </span>
                </button>
              ))}
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

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p
        className="text-[11px] mb-1 tracking-[0.15em] uppercase"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        {label}
      </p>
      <p
        className="text-[1.75rem] leading-none tabular-nums"
        style={{
          color: accent ? 'var(--color-accent)' : 'var(--color-fg-strong)',
          fontWeight: 500,
        }}
      >
        {value}
      </p>
    </div>
  );
}
