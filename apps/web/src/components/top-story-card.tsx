'use client';

import { motion } from 'motion/react';
import type { ArticleDto } from './article-card';
import { relativeTime } from '@/lib/relative-time';
import { useChat } from './chat-context';

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
  const chat = useChat();

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
          className="text-[1.625rem] sm:text-[2.25rem] lg:text-[2.75rem] font-medium leading-[1.2] tracking-[-0.01em] transition-colors break-keep"
          style={{ color: 'var(--color-fg-strong)' }}
        >
          {article.title}
        </h2>

        {article.summaryOneLine && (
          <p
            className="text-[15px] sm:text-[1.0625rem] mt-4 sm:mt-5 leading-[1.65] max-w-2xl"
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
        <button
          type="button"
          onClick={() => chat?.ask(`${article.title} 에 대해 설명해줘`)}
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
        </button>
      </div>
    </motion.article>
  );
}
