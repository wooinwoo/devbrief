'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { relativeTime } from '@/lib/relative-time';
import type { ArticleDto } from './article-card';

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

interface Props {
  article: ArticleDto;
  read?: boolean;
  onOpen?: () => void;
}

export function FeaturedArticle({ article, read = false, onOpen }: Props) {
  const dot = SOURCE_DOT[article.source.provider] ?? SOURCE_DOT.rss_generic;

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className={`relative pb-7 mb-6 border-b ${read ? 'opacity-65' : ''}`}
      style={{ borderColor: 'var(--color-line)' }}
    >
      {/* 잡지 톤 overline */}
      <div className="flex items-baseline gap-3 mb-3 text-[11px] tracking-[0.25em] uppercase">
        <span
          style={{ color: 'var(--color-accent)', fontWeight: 700 }}
          aria-label="Featured 라벨"
        >
          Featured
        </span>
        <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
        <span style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}>
          Top Story
        </span>
      </div>

      <Link
        href={`/articles/${article.id}`}
        onClick={onOpen}
        className="group block focus-visible:outline-none"
      >
        <div
          className={`grid gap-x-8 gap-y-4 ${article.imageUrl ? 'md:grid-cols-[1.4fr_1fr] items-center' : ''}`}
        >
          <div>
            <h2
              className="text-[1.5rem] sm:text-[1.875rem] lg:text-[2rem] leading-[1.15] tracking-[-0.012em] break-keep mb-2"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
            >
              <span className="group-hover:underline underline-offset-[6px] decoration-(--color-accent)">
                {article.titleKo ?? article.title}
              </span>
            </h2>
            {article.titleKo && article.title !== article.titleKo && (
              <p
                className="text-[12.5px] mb-3 tracking-wide"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                {article.title}
              </p>
            )}

            {article.summaryOneLine && (
              <p
                className="text-[14.5px] leading-[1.6] mb-4 max-w-xl"
                style={{ color: 'var(--color-fg-default)' }}
              >
                {article.summaryOneLine}
              </p>
            )}

            <div className="flex items-center gap-2 text-[12.5px] flex-wrap">
              {!read && (
                <span
                  aria-label="안 본 글"
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: dot }}
                />
              )}
              <span
                style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}
              >
                {article.source.name}
              </span>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>
                {relativeTime(article.publishedAt)}
              </span>
              {article.tags.slice(0, 3).map((t) => (
                <>
                  <span
                    key={`s-${t}`}
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    ·
                  </span>
                  <span
                    key={t}
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    #{t}
                  </span>
                </>
              ))}
            </div>
          </div>

          {article.imageUrl && (
            <div
              className="relative aspect-[4/3] overflow-hidden order-first md:order-last"
              style={{ borderRadius: 4 }}
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
    </motion.article>
  );
}
