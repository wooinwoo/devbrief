'use client';

import { motion } from 'motion/react';
import { MOCK_VIDEOS } from '@/lib/mock-videos';

function relativeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (day < 1) return '오늘';
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  return `${Math.floor(day / 30)}개월 전`;
}

export function VideoRow() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: 0.08 }}
      className="mb-14"
    >
      <div className="flex items-baseline gap-3 mb-6">
        <h2
          className="text-[12px] tracking-[0.25em] uppercase"
          style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
        >
          이번 주 발표 영상
        </h2>
        <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
          {MOCK_VIDEOS.length}
        </span>
        <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
      </div>

      <ul
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 sm:-mx-10 sm:px-10 lg:-mx-16 lg:px-16 xl:-mx-24 xl:px-24"
        style={{ scrollbarWidth: 'thin' }}
      >
        {MOCK_VIDEOS.map((v, i) => (
          <motion.li
            key={v.id}
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
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden transition-all motion-safe:hover:-translate-y-0.5"
              style={{
                borderRadius: 12,
                border: '1px solid var(--color-line)',
                background: 'var(--color-bg-elevated)',
              }}
            >
              <div className="relative aspect-video overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, oklch(0% 0 0 / 0.5) 0%, transparent 50%)',
                  }}
                />
                {/* play icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full transition-transform group-hover:scale-110"
                    style={{
                      background: 'oklch(98% 0 0 / 0.92)',
                      boxShadow: '0 8px 24px -4px oklch(0% 0 0 / 0.3)',
                    }}
                  >
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                      <path
                        d="M2 1.5L12 8L2 14.5V1.5Z"
                        fill="oklch(20% 0.012 245)"
                      />
                    </svg>
                  </span>
                </div>
                {/* duration badge */}
                <span
                  className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[11px] tabular-nums"
                  style={{
                    background: 'oklch(15% 0 0 / 0.85)',
                    color: 'oklch(98% 0 0)',
                    fontWeight: 600,
                  }}
                >
                  {v.duration}
                </span>
              </div>

              <div className="p-4">
                <div
                  className="text-[11px] mb-1.5 tracking-wide"
                  style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
                >
                  {v.channel}
                </div>
                <h3
                  className="text-[14.5px] leading-snug tracking-[-0.005em] transition-colors"
                  style={{
                    color: 'var(--color-fg-strong)',
                    fontWeight: 600,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {v.title}
                </h3>
                <div className="mt-2 flex items-center gap-2 text-[12px]">
                  <span style={{ color: 'var(--color-fg-muted)' }}>{v.views} views</span>
                  <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                  <span style={{ color: 'var(--color-fg-muted)' }}>
                    {relativeShort(v.publishedAt)}
                  </span>
                </div>
              </div>
            </a>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
