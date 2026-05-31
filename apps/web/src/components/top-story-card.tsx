'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import type { ArticleDto } from './article-card';
import { relativeTime } from '@/lib/relative-time';

// 잭 톤 정돈: source 별 무지개 glow / bar 제거. 모든 Top Story 동일 회색 톤.
// 소스 구분은 dot 한 개로만 (글 카드와 동일 규약).
const SOURCE_DOT: Record<string, string> = {
  geeknews: 'oklch(48% 0.16 160)',
  hackernews: 'oklch(55% 0.18 45)',
  devto: 'oklch(48% 0.18 290)',
  techcrunch: 'oklch(50% 0.21 15)',
  anthropic: 'oklch(55% 0.17 60)',
  openai: 'oklch(50% 0.15 220)',
  producthunt: 'oklch(54% 0.20 340)',
  rss_generic: 'oklch(50% 0.012 250)',
};

const BAR_GRAY = 'oklch(75% 0.008 250)';

interface Props {
  article: ArticleDto;
  read?: boolean;
  onOpen?: () => void;
}

export function TopStoryCard({ article, read = false, onOpen }: Props) {
  const dot = SOURCE_DOT[article.source.provider] ?? SOURCE_DOT.rss_generic;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      className={`relative mb-16 pl-6 ${read ? 'opacity-60' : ''}`}
    >
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-8 w-px"
        style={{ background: BAR_GRAY }}
      />

      <p
        className="text-[12px] mb-4 tracking-[0.25em] uppercase"
        style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
      >
        Top Story
      </p>

      <Link
        href={`/articles/${article.id}`}
        onClick={onOpen}
        className="block group focus-visible:outline-none"
      >
        <div className={`grid gap-x-10 gap-y-6 ${article.imageUrl ? 'lg:grid-cols-[1.3fr_1fr] items-center' : ''}`}>
          <div>
            <div className="flex items-center gap-2 mb-4 text-[13.5px]">
              {!read && (
                <span
                  aria-label="안 본 글"
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: dot }}
                />
              )}
              <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }} className="tracking-wide">
                {article.source.name}
              </span>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>{relativeTime(article.publishedAt)}</span>
            </div>

            <h2
              className="text-[1.875rem] sm:text-[2.5rem] lg:text-[3rem] leading-[1.15] tracking-[-0.015em] transition-colors break-keep"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
            >
              {article.title}
            </h2>

            {article.summaryOneLine && (
              <p
                className="text-[16px] sm:text-[17px] mt-5 sm:mt-6 leading-[1.7] max-w-2xl"
                style={{ color: 'var(--color-fg-default)' }}
              >
                {article.summaryOneLine}
              </p>
            )}
          </div>

          {article.imageUrl && (
            <div
              className="relative aspect-[4/3] overflow-hidden order-first lg:order-last"
              style={{ borderRadius: 6 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </div>
          )}
        </div>
      </Link>

      <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
        {article.tags.slice(0, 5).map((t) => (
          <span key={t} className="text-[12.5px]" style={{ color: 'var(--color-fg-muted)' }}>
            #{t}
          </span>
        ))}
      </div>
    </motion.article>
  );
}
