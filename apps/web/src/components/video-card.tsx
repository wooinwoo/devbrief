'use client';

import { formatVideoDuration } from '@/lib/format-duration';
import { formatViews } from '@/lib/format-views';
import type { VideoDto } from '@/lib/mock-videos';
import Link from 'next/link';
import { useState } from 'react';

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
}

/** 실제 썸네일과 제목을 중심으로 보여주는 영상 목록 항목. */
export function VideoCard({ video: v }: Props) {
  const [imgError, setImgError] = useState(false);
  const hasThumb = !!v.thumbnailUrl && !imgError;

  return (
    <li className="video-card min-w-0">
      <Link href={`/videos/${v.id}`} className="group block">
        <div
          className="relative aspect-video overflow-hidden mb-4 rounded-md"
          style={{ background: 'var(--bar-bg)' }}
        >
          {hasThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.thumbnailUrl}
              alt=""
              loading="lazy"
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5"
              style={{ color: 'var(--bar-fg)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="m9 5 10 7-10 7V5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[13px] text-center break-words">{v.channel}</span>
            </div>
          )}
          <span
            className="absolute bottom-2 right-2 tabular-nums text-[11px] px-1.5 py-0.5 rounded-sm"
            style={{
              background: 'oklch(18% 0.02 265 / 0.92)',
              color: 'oklch(99% 0 0)',
              fontWeight: 600,
            }}
          >
            {formatVideoDuration(v.durationSec)}
          </span>
        </div>

        {/* 제목 */}
        <h3
          className="text-[16px] leading-[1.5] tracking-[-0.015em] break-keep group-hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
          style={{
            color: 'var(--color-fg-strong)',
            fontWeight: 650,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {v.title}
        </h3>

        <p className="mt-2 text-[12px]" style={{ color: 'var(--color-fg-muted)' }}>
          {v.channel}
        </p>

        {/* 메타 */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
          <span style={{ color: 'var(--color-fg-muted)' }}>조회수 {formatViews(v.views)}회</span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>{relativeShort(v.publishedAt)}</span>
        </div>
      </Link>
    </li>
  );
}
