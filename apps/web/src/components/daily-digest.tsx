'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

export interface DigestItem {
  articleId: string;
  headline: string;
  takeaway: string;
}

export interface DigestDto {
  date: string;
  intro: string | null;
  items: DigestItem[];
}

interface Props {
  digest: DigestDto | null;
}

/**
 * 메인 상단 — 매일 09:30 Gemini 가 만든 오늘의 핵심 5개.
 * 없으면 null (섹션 자체 안 그림).
 */
export function DailyDigest({ digest }: Props) {
  if (!digest || digest.items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
    >
      {/* 룰러 헤더 */}
      <div
        className="flex items-baseline gap-3 mb-4 pb-2 border-b"
        style={{ borderColor: 'var(--color-fg-strong)' }}
      >
        <span
          className="text-[15px] tracking-[-0.01em]"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          오늘의 핵심
        </span>
        <span
          className="text-[11.5px] tabular-nums"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          {digest.items.length}
        </span>
        <span className="flex-1" />
        <span
          className="text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
        >
          오늘의 선별
        </span>
      </div>

      {digest.intro && (
        <p
          className="text-[14px] leading-[1.7] mb-5 max-w-2xl"
          style={{ color: 'var(--color-fg-default)' }}
        >
          {digest.intro}
        </p>
      )}

      <ol className="grid gap-x-8 gap-y-0 md:grid-cols-2">
        {digest.items.map((it, i) => (
          <li
            key={it.articleId}
            className="border-b"
            style={{ borderColor: 'var(--color-line)' }}
          >
            <Link
              href={`/articles/${it.articleId}`}
              className="group flex gap-3 items-baseline py-3"
            >
              <span
                className="shrink-0 tabular-nums text-[13px] leading-none w-5"
                style={{ color: 'var(--color-accent)', fontWeight: 700 }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <span
                  className="block text-[14px] leading-snug tracking-[-0.005em] break-keep group-hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
                  style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
                >
                  {it.headline}
                </span>
                {it.takeaway && (
                  <span
                    className="block text-[12px] mt-1 leading-[1.5]"
                    style={{ color: 'var(--color-fg-muted)' }}
                  >
                    {it.takeaway}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </motion.section>
  );
}
