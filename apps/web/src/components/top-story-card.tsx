'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import type { ArticleDto } from './article-card';
import { relativeTime } from '@/lib/relative-time';

const SOURCE_GLOW: Record<string, string> = {
  geeknews: 'oklch(75% 0.15 160 / 0.18)',
  hackernews: 'oklch(75% 0.16 50 / 0.18)',
  devto: 'oklch(72% 0.16 290 / 0.18)',
  techcrunch: 'oklch(72% 0.18 15 / 0.18)',
  anthropic: 'oklch(80% 0.14 70 / 0.20)',
  openai: 'oklch(75% 0.13 220 / 0.18)',
  producthunt: 'oklch(74% 0.17 340 / 0.18)',
  rss_generic: 'oklch(60% 0.01 250 / 0.12)',
};

const SOURCE_BAR: Record<string, string> = {
  geeknews: 'oklch(75% 0.15 160)',
  hackernews: 'oklch(75% 0.16 50)',
  devto: 'oklch(72% 0.16 290)',
  techcrunch: 'oklch(72% 0.18 15)',
  anthropic: 'oklch(80% 0.14 70)',
  openai: 'oklch(75% 0.13 220)',
  producthunt: 'oklch(74% 0.17 340)',
  rss_generic: 'oklch(60% 0.01 250)',
};

interface Props {
  article: ArticleDto;
  read?: boolean;
  onOpen?: () => void;
}

export function TopStoryCard({ article, read = false, onOpen }: Props) {
  const glow = SOURCE_GLOW[article.source.provider] ?? SOURCE_GLOW.rss_generic;
  const bar = SOURCE_BAR[article.source.provider] ?? SOURCE_BAR.rss_generic;
  const askUrl = `/chat?q=${encodeURIComponent(`${article.title} 에 대해 설명해줘`)}`;

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
        className="text-[11px] mb-4 tracking-[0.2em] uppercase"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        Top Story
      </p>

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        className="block group focus-visible:outline-none"
      >
        <div className="flex items-center gap-2 mb-4 text-[13px]">
          <span style={{ color: bar }} className="font-medium tracking-wide">
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
          className="text-[2.25rem] sm:text-[2.75rem] font-medium leading-[1.15] tracking-[-0.01em] transition-colors"
          style={{ color: 'var(--color-fg-strong)' }}
        >
          {article.title}
        </h2>

        {article.summaryOneLine && (
          <p
            className="text-[1.0625rem] mt-5 leading-[1.65] max-w-2xl"
            style={{ color: 'var(--color-fg-default)' }}
          >
            {article.summaryOneLine}
          </p>
        )}
      </a>

      <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
        {article.tags.slice(0, 5).map((t) => (
          <span key={t} className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>
            #{t}
          </span>
        ))}
        <span className="flex-1" />
        <Link
          href={askUrl}
          className="text-[13px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all"
          style={{
            color: bar,
            border: `1px solid ${bar.replace(' / 0.', ' / 0.3 / 0.')}`,
            background: `linear-gradient(to right, ${glow.replace(' / 0.', ' / 0.08 / 0.')}, transparent)`,
          }}
        >
          <span
            aria-hidden
            className="inline-block w-1 h-1 rounded-full"
            style={{ background: bar }}
          />
          이 글로 챗봇에 묻기
        </Link>
      </div>
    </motion.article>
  );
}
