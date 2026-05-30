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
  const [hero, ...rest] = MOCK_VIDEOS;
  const sideList = rest.slice(0, 4);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: 0.08 }}
      className="mb-20"
    >
      {/* 잡지 톤 헤더 - uppercase tracking X */}
      <div className="flex items-end justify-between mb-7 pb-4 border-b" style={{ borderColor: 'var(--color-line)' }}>
        <div>
          <h2
            className="text-[1.875rem] sm:text-[2.125rem] leading-none tracking-[-0.025em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            지금 보는 발표
          </h2>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            이번 주 컨퍼런스 영상{' '}
            <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
              {MOCK_VIDEOS.length}
            </span>
            개를 모아놨어요.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* 좌: 메인 (큰 영상) */}
        <a
          href={hero.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <div
            className="relative aspect-[16/10] overflow-hidden mb-4"
            style={{ borderRadius: 4 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.thumbnail}
              alt={hero.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, oklch(0% 0 0 / 0.65) 0%, transparent 55%)',
              }}
            />
            {/* 좌하단 채널 + 시간 */}
            <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
              <div>
                <span
                  className="text-[11px] tracking-wide"
                  style={{ color: 'oklch(98% 0 0 / 0.85)', fontWeight: 600 }}
                >
                  {hero.channel}
                </span>
              </div>
              <span
                className="text-[12px] tabular-nums px-2 py-0.5"
                style={{
                  color: 'oklch(98% 0 0)',
                  background: 'oklch(0% 0 0 / 0.55)',
                  borderRadius: 2,
                  fontWeight: 600,
                }}
              >
                {hero.duration}
              </span>
            </div>
            {/* 재생 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-14 h-14 rounded-full transition-transform group-hover:scale-110"
                style={{
                  background: 'oklch(98% 0 0 / 0.95)',
                  boxShadow: '0 8px 32px -4px oklch(0% 0 0 / 0.4)',
                }}
              >
                <svg width="16" height="18" viewBox="0 0 14 16" fill="none">
                  <path d="M2 1.5L12 8L2 14.5V1.5Z" fill="oklch(20% 0.012 245)" />
                </svg>
              </span>
            </div>
          </div>
          <h3
            className="text-[1.375rem] leading-[1.25] tracking-[-0.012em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            {hero.title}
          </h3>
          <div className="mt-3 flex items-center gap-2 text-[12.5px]">
            <span style={{ color: 'var(--color-fg-muted)' }}>
              조회수 {hero.views}
            </span>
            <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
            <span style={{ color: 'var(--color-fg-muted)' }}>
              {relativeShort(hero.publishedAt)}
            </span>
          </div>
        </a>

        {/* 우: 리스트 */}
        <ul className="flex flex-col">
          {sideList.map((v, i) => (
            <motion.li
              key={v.id}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.35,
                ease: [0.2, 0, 0, 1],
                delay: 0.1 + i * 0.04,
              }}
            >
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 py-3.5 first:pt-0 border-b last:border-b-0 transition-colors"
                style={{ borderColor: 'var(--color-line)' }}
              >
                <div
                  className="relative shrink-0 w-[140px] aspect-[16/10] overflow-hidden"
                  style={{ borderRadius: 3 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    className="absolute bottom-1 right-1 px-1.5 py-px text-[10px] tabular-nums"
                    style={{
                      background: 'oklch(0% 0 0 / 0.7)',
                      color: 'oklch(98% 0 0)',
                      fontWeight: 600,
                      borderRadius: 2,
                    }}
                  >
                    {v.duration}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[11px] mb-1 tracking-wide"
                    style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
                  >
                    {v.channel}
                  </div>
                  <h3
                    className="text-[14.5px] leading-[1.35] tracking-[-0.005em]"
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
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]">
                    <span style={{ color: 'var(--color-fg-muted)' }}>
                      {v.views} views
                    </span>
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
      </div>
    </motion.section>
  );
}
