'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import type { ArticleDto } from './article-card';
import { relativeTime } from '@/lib/relative-time';

const SOURCE_GLOW: Record<string, string> = {
  geeknews: 'oklch(60% 0.16 160 / 0.12)',
  hackernews: 'oklch(60% 0.18 45 / 0.12)',
  devto: 'oklch(60% 0.18 290 / 0.12)',
  techcrunch: 'oklch(60% 0.21 15 / 0.12)',
  anthropic: 'oklch(65% 0.17 60 / 0.15)',
  openai: 'oklch(60% 0.15 220 / 0.12)',
  producthunt: 'oklch(60% 0.20 340 / 0.12)',
  rss_generic: 'oklch(60% 0.012 250 / 0.08)',
};

const SOURCE_BAR: Record<string, string> = {
  geeknews: 'oklch(48% 0.16 160)',
  hackernews: 'oklch(55% 0.18 45)',
  devto: 'oklch(48% 0.18 290)',
  techcrunch: 'oklch(50% 0.21 15)',
  anthropic: 'oklch(55% 0.17 60)',
  openai: 'oklch(50% 0.15 220)',
  producthunt: 'oklch(54% 0.20 340)',
  rss_generic: 'oklch(45% 0.012 250)',
};

interface Props {
  article: ArticleDto;
  read?: boolean;
  onOpen?: () => void;
}

export function TopStoryCard({ article, read = false, onOpen }: Props) {
  const glow = SOURCE_GLOW[article.source.provider] ?? SOURCE_GLOW.rss_generic;
  const bar = SOURCE_BAR[article.source.provider] ?? SOURCE_BAR.rss_generic;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      className={`relative mb-16 pl-6 ${read ? 'opacity-60' : ''}`}
    >
      {/* 좌측 source 색 vertical bar */}
      <span
        aria-hidden
        className="pulse-bar absolute left-0 top-2 bottom-8 w-px"
        style={{
          background: `linear-gradient(to bottom, ${bar} 0%, ${bar} 40%, transparent 100%)`,
          boxShadow: `0 0 12px ${bar}`,
        }}
      />

      {/* glow halo */}
      <div
        aria-hidden
        className="absolute -left-8 -top-12 -right-8 h-64 -z-10 rounded-3xl blur-3xl pointer-events-none"
        style={{ background: glow }}
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
              <span style={{ color: bar, fontWeight: 600 }} className="tracking-wide">
                {article.source.name}
              </span>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>{relativeTime(article.publishedAt)}</span>
              {!read && (
                <span
                  aria-label="안 본 글"
                  className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: bar }}
                />
              )}
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
