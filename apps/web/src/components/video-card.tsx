'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { formatDuration } from '@/lib/format-duration';
import { formatViews } from '@/lib/format-views';
import type { VideoDto } from '@/lib/mock-videos';

function relativeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (day < 1) return '오늘';
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  return `${Math.floor(day / 30)}개월 전`;
}

interface Props {
  video: VideoDto;
  index?: number;
}

/**
 * YouTube 썸네일 위주 카드.
 * 썸네일 없으면 brand 그라데이션 + 큰 duration fallback.
 */
export function VideoCard({ video: v, index = 0 }: Props) {
  const [imgError, setImgError] = useState(false);
  const hasThumb = !!v.thumbnailUrl && !imgError;
  const brand = v.brand ?? 'oklch(45% 0.012 245)';

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: 0.04 * index }}
    >
      <Link
        href={`/videos/${v.id}`}
        className="group block transition-transform motion-safe:hover:-translate-y-1"
      >
        {/* 썸네일 */}
        <div
          className="relative aspect-video overflow-hidden mb-3"
          style={{
            borderRadius: 8,
            background: hasThumb
              ? 'oklch(92% 0.01 290)'
              : `linear-gradient(135deg, ${brand}, ${brand.replace(')', ' / 0.6)')})`,
          }}
        >
          {hasThumb && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.thumbnailUrl}
                alt={v.title}
                onError={() => setImgError(true)}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, oklch(0% 0 0 / 0.4) 0%, transparent 50%)',
                }}
              />
            </>
          )}

          {/* 좌상단 채널 (없으면 안 보임) */}
          {!hasThumb && (
            <div className="absolute top-4 left-4">
              <span
                className="text-[11px] tracking-wide uppercase"
                style={{
                  color: 'oklch(99% 0 0 / 0.7)',
                  fontWeight: 600,
                }}
              >
                {v.channel}
              </span>
            </div>
          )}

          {/* 중앙 재생 아이콘 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-12 h-12 rounded-full transition-transform group-hover:scale-110"
              style={{
                background: 'oklch(99% 0 0 / 0.92)',
                boxShadow: '0 8px 24px -4px oklch(0% 0 0 / 0.4)',
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

          {/* 우하단 duration */}
          <span
            className="absolute bottom-2.5 right-2.5 tabular-nums text-[11px] px-1.5 py-0.5"
            style={{
              background: 'oklch(0% 0 0 / 0.78)',
              color: 'oklch(99% 0 0)',
              fontWeight: 600,
              borderRadius: 3,
            }}
          >
            {formatDuration(v.durationSec)}
          </span>

          {/* 이미지 없으면 좌하단 큰 duration */}
          {!hasThumb && (
            <div className="absolute bottom-4 left-4">
              <span
                className="leading-none tabular-nums tracking-[-0.04em]"
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  color: 'oklch(99% 0 0)',
                }}
              >
                {formatDuration(v.durationSec)}
              </span>
            </div>
          )}
        </div>

        {/* 채널 */}
        <div
          className="text-[12px] mb-1 tracking-wide"
          style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
        >
          {v.channel}
        </div>

        {/* 제목 */}
        <h3
          className="text-[14.5px] leading-[1.35] tracking-[-0.005em] break-keep group-hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
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

        {/* 메타 */}
        <div className="mt-2 flex items-center gap-2 text-[11.5px]">
          <span style={{ color: 'var(--color-fg-muted)' }}>
            조회수 {formatViews(v.views)}회
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>
            {relativeShort(v.publishedAt)}
          </span>
        </div>
      </Link>
    </motion.li>
  );
}
