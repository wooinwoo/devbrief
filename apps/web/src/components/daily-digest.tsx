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
      className="mb-10 pb-6 border-b"
      style={{ borderColor: 'var(--color-line)' }}
    >
      <div
        className="flex items-baseline gap-3 mb-3 pt-1 border-t-2"
        style={{ borderColor: 'var(--color-fg-strong)' }}
      >
        <span
          className="text-[14px] tracking-[-0.005em]"
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
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
        >
          AI digest · Gemini
        </span>
      </div>

      {digest.intro && (
        <p
          className="text-[13.5px] leading-[1.6] mb-4 max-w-2xl"
          style={{ color: 'var(--color-fg-default)' }}
        >
          {digest.intro}
        </p>
      )}

      <ol className="grid gap-x-6 gap-y-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {digest.items.map((it, i) => (
          <li
            key={it.articleId}
            className="grid grid-cols-[auto_1fr] gap-3 items-baseline py-2 border-b last:border-b-0"
            style={{ borderColor: 'var(--color-line)' }}
          >
            <span
              className="tabular-nums text-[18px] leading-none tracking-[-0.02em] shrink-0"
              style={{
                color: 'var(--color-accent)',
                fontWeight: 700,
                width: 22,
              }}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <Link
                href={`/articles/${it.articleId}`}
                className="block text-[14.5px] tracking-[-0.005em] hover:underline underline-offset-2 decoration-(--color-fg-subtle) break-keep"
                style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
              >
                {it.headline}
              </Link>
              <p
                className="text-[12.5px] mt-0.5 leading-[1.5]"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                {it.takeaway}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </motion.section>
  );
}
