'use client';

import { motion } from 'motion/react';
import { MOCK_VIDEOS, type VideoDto } from '@/lib/mock-videos';
import { formatDuration } from '@/lib/format-duration';

function formatViews(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function relativeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (day < 1) return '오늘';
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  return `${Math.floor(day / 30)}개월 전`;
}

interface Props {
  videos?: VideoDto[];
}

export function VideoRow({ videos }: Props = {}) {
  const list = videos && videos.length > 0 ? videos : MOCK_VIDEOS;
  const [hero, ...rest] = list;
  if (!hero) return null;
  const sideList = rest.slice(0, 4);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: 0.08 }}
      className="mb-20"
    >
      <div className="flex items-end justify-between mb-7 pb-4 border-b" style={{ borderColor: 'var(--color-line)' }}>
        <div>
          <h2
            className="text-[1.5rem] sm:text-[2.125rem] leading-none tracking-[-0.025em] break-keep"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            지금 보는 발표
          </h2>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            이번 주 컨퍼런스 영상{' '}
            <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
              {list.length}
            </span>
            개를 모아놨어요.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* 좌: 메인 (큰 영상) — 이미지 X, brand 색 + 큰 duration */}
        <a
          href={hero.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <div
            className="relative aspect-[16/10] overflow-hidden mb-4 flex flex-col justify-between p-6"
            style={{
              borderRadius: 4,
              background: hero.brand ?? 'oklch(45% 0.012 245)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] tracking-wide"
                style={{ color: 'oklch(98% 0 0 / 0.8)', fontWeight: 600 }}
              >
                {hero.channel}
              </span>
              {/* 재생 표시 — 작게 */}
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-9 h-9 rounded-full"
                style={{ background: 'oklch(99% 0 0 / 0.15)' }}
              >
                <svg width="12" height="14" viewBox="0 0 14 16" fill="none">
                  <path
                    d="M2 1.5L12 8L2 14.5V1.5Z"
                    fill="oklch(99% 0 0 / 0.9)"
                  />
                </svg>
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span
                className="text-[12px]"
                style={{ color: 'oklch(98% 0 0 / 0.65)' }}
              >
                재생 시간
              </span>
              <span
                className="text-[3.25rem] leading-none tabular-nums tracking-[-0.04em]"
                style={{
                  color: 'oklch(99% 0 0)',
                  fontWeight: 700,
                }}
              >
                {formatDuration(hero.durationSec)}
              </span>
            </div>
          </div>
          <h3
            className="text-[1.375rem] leading-[1.25] tracking-[-0.012em] break-keep"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            {hero.title}
          </h3>
          <div className="mt-3 flex items-center gap-2 text-[12.5px]">
            <span style={{ color: 'var(--color-fg-muted)' }}>
              조회수 {formatViews(hero.views)}
            </span>
            <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
            <span style={{ color: 'var(--color-fg-muted)' }}>
              {relativeShort(hero.publishedAt)}
            </span>
          </div>
        </a>

        {/* 우: 리스트 — duration 좌측 큰 글자 + 텍스트 우측 */}
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
                className="group flex items-center gap-5 py-4 first:pt-0 border-b last:border-b-0 transition-colors"
                style={{ borderColor: 'var(--color-line)' }}
              >
                {/* 좌측: duration 큰 글자 + brand 색 dot */}
                <div className="shrink-0 w-[88px] flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: v.brand ?? 'var(--color-fg-subtle)' }}
                  />
                  <span
                    className="text-[1.05rem] tabular-nums tracking-[-0.015em]"
                    style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
                  >
                    {formatDuration(v.durationSec)}
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
                    className="text-[14px] leading-[1.35] tracking-[-0.005em] break-keep"
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
                </div>
              </a>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
