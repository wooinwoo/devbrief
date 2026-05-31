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
      className="mb-2 p-6 sm:p-7 rounded-2xl border relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, var(--color-accent-soft), var(--color-bg-elevated) 70%)',
        borderColor: 'oklch(85% 0.05 292)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* 우상단 장식 글로우 */}
      <div
        aria-hidden
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'oklch(70% 0.18 292 / 0.18)' }}
      />

      <div className="relative flex items-center gap-2.5 mb-4">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[13px]"
          style={{ background: 'var(--color-accent)', color: 'oklch(99% 0 0)' }}
        >
          ✦
        </span>
        <span
          className="text-[15px] tracking-[-0.01em]"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          오늘의 핵심
        </span>
        <span
          className="text-[11.5px] tabular-nums px-1.5 py-0.5 rounded-full"
          style={{
            color: 'var(--color-accent-strong)',
            background: 'oklch(88% 0.06 292)',
            fontWeight: 600,
          }}
        >
          {digest.items.length}
        </span>
        <span className="flex-1" />
        <span
          className="text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--color-accent-strong)', fontWeight: 700 }}
        >
          AI · Gemini
        </span>
      </div>

      {digest.intro && (
        <p
          className="relative text-[14px] leading-[1.65] mb-5 max-w-2xl"
          style={{ color: 'var(--color-fg-default)' }}
        >
          {digest.intro}
        </p>
      )}

      <ol className="relative grid gap-2.5 md:grid-cols-2">
        {digest.items.map((it, i) => (
          <li key={it.articleId}>
            <Link
              href={`/articles/${it.articleId}`}
              className="group flex gap-3 items-start p-3 rounded-xl transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-line)',
              }}
            >
              <span
                className="flex items-center justify-center shrink-0 w-6 h-6 rounded-lg tabular-nums text-[12px]"
                style={{
                  background: 'var(--color-accent)',
                  color: 'oklch(99% 0 0)',
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <span
                  className="block text-[14px] leading-snug tracking-[-0.005em] break-keep group-hover:text-(--color-accent-strong) transition-colors"
                  style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
                >
                  {it.headline}
                </span>
                <span
                  className="block text-[12px] mt-1 leading-[1.5]"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {it.takeaway}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </motion.section>
  );
}
