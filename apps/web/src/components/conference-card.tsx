'use client';

import { motion } from 'motion/react';
import type { ConferenceDto } from '@/lib/mock-conferences';

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDateWeekday(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  });
  const weekday = d.toLocaleDateString('ko-KR', { weekday: 'short' });
  return `${date.replace(/\. /g, '월').replace('.', '일')} (${weekday})`;
}

interface Props {
  conference: ConferenceDto;
  index?: number;
}

/**
 * onoffmix 톤 — 키비주얼 이미지 위주 카드.
 * 이미지 없으면 brand 그라데이션 + 큰 D-day 타이포로 fallback.
 */
export function ConferenceCard({ conference: c, index = 0 }: Props) {
  const d = daysUntil(c.startDate);
  const brand = c.brand ?? 'oklch(50% 0.012 245)';
  const hasImage = !!c.imageUrl;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: 0.04 * index }}
    >
      <a
        href={c.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block transition-transform motion-safe:hover:-translate-y-1"
      >
        {/* 키비주얼 영역 */}
        <div
          className="relative aspect-[16/10] overflow-hidden mb-3"
          style={{
            borderRadius: 8,
            background: hasImage
              ? '#000'
              : `linear-gradient(135deg, ${brand}, ${brand.replace(')', ' / 0.6)')})`,
          }}
        >
          {hasImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.imageUrl!}
                alt={c.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* 살짝 어두운 오버레이로 텍스트 가독성 확보 */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, oklch(0% 0 0 / 0.35) 0%, transparent 50%)',
                }}
              />
            </>
          )}

          {/* 우상단 D-day batch */}
          <span
            className="absolute top-3 right-3 tabular-nums text-[12px] px-2 py-0.5"
            style={{
              background: hasImage ? 'oklch(99% 0 0 / 0.95)' : brand,
              color: hasImage ? brand : 'oklch(99% 0 0)',
              fontWeight: 700,
              borderRadius: 3,
            }}
          >
            D-{d}
          </span>

          {/* 이미지 없을 때 좌하단 큰 D-day */}
          {!hasImage && (
            <div className="absolute inset-0 flex items-end justify-end p-5">
              <span
                className="leading-none tabular-nums tracking-[-0.04em]"
                style={{
                  fontSize: '4rem',
                  fontWeight: 700,
                  color: 'oklch(99% 0 0)',
                }}
              >
                {d}
              </span>
            </div>
          )}
        </div>

        {/* 메타: 날짜 + 장소 */}
        <div className="flex items-baseline gap-2 mb-1.5 text-[12px]">
          <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
            {fmtDateWeekday(c.startDate)}
          </span>
          {c.location && (
            <>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>
                {c.location}
              </span>
            </>
          )}
        </div>

        {/* 제목 */}
        <h3
          className="text-[15px] leading-[1.35] tracking-[-0.005em] break-keep group-hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
          style={{
            color: 'var(--color-fg-strong)',
            fontWeight: 700,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {c.name}
        </h3>

        {/* 토픽 + 가격 한 줄 */}
        <div className="mt-2 flex items-center gap-2 text-[11.5px]">
          {c.topics.length > 0 && (
            <span style={{ color: 'var(--color-fg-subtle)' }}>
              {c.topics.slice(0, 3).map((t) => `#${t}`).join(' ')}
            </span>
          )}
          <span className="flex-1" />
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            무료 / 미정
          </span>
        </div>
      </a>
    </motion.li>
  );
}
