'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import type { ArticleDto } from './article-card';
import { relativeTime } from '@/lib/relative-time';
import { readTracking } from '@/lib/read-tracking';

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

const SOURCE_GLOW: Record<string, string> = {
  geeknews: 'oklch(60% 0.16 160 / 0.10)',
  hackernews: 'oklch(60% 0.18 45 / 0.10)',
  devto: 'oklch(60% 0.18 290 / 0.10)',
  techcrunch: 'oklch(60% 0.21 15 / 0.10)',
  anthropic: 'oklch(65% 0.17 60 / 0.12)',
  openai: 'oklch(60% 0.15 220 / 0.10)',
  producthunt: 'oklch(60% 0.20 340 / 0.10)',
  rss_generic: 'oklch(60% 0.012 250 / 0.06)',
};

function readingMinutes(article: { title: string; summaryOneLine: string | null }): number {
  const length = (article.title?.length ?? 0) + (article.summaryOneLine?.length ?? 0) * 8;
  return Math.max(1, Math.round(length / 600));
}

interface Props {
  article: ArticleDto;
  related: ArticleDto[];
}

export function ArticleDetail({ article, related }: Props) {
  const bar = SOURCE_BAR[article.source.provider] ?? SOURCE_BAR.rss_generic;
  const glow = SOURCE_GLOW[article.source.provider] ?? SOURCE_GLOW.rss_generic;
  const minutes = readingMinutes(article);
  const askUrl = `/?q=${encodeURIComponent(`${article.title} 에 대해 설명해줘`)}#chat`;

  useEffect(() => {
    readTracking.add(article.id);
  }, [article.id]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      className="relative"
    >
      <Link
        href="/"
        className="text-[12px] inline-block mb-6 tracking-wide"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        <span className="hover:text-(--color-fg-strong) transition-colors">
          ← 오늘의 흐름
        </span>
      </Link>

      <header className="relative pl-6 mb-10">
        <div
          aria-hidden
          className="absolute -left-4 -top-8 -right-4 h-48 -z-10 rounded-3xl blur-3xl pointer-events-none"
          style={{ background: glow }}
        />
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[2px]"
          style={{
            background: `linear-gradient(to bottom, ${bar}, transparent 80%)`,
            boxShadow: `0 0 10px ${bar}`,
          }}
        />

        <div className="flex flex-wrap items-center gap-2 mb-4 text-[13px]">
          <span style={{ color: bar }} className="tracking-wide font-medium">
            {article.source.name}
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>
            {relativeTime(article.publishedAt)}
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span className="tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
            {minutes}분 읽기
          </span>
        </div>

        <h1
          className="text-[1.75rem] sm:text-[2.5rem] leading-[1.2] tracking-[-0.01em]"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 500 }}
        >
          {article.title}
        </h1>

        {article.summaryOneLine && (
          <p
            className="mt-5 text-[1.0625rem] leading-[1.7] max-w-2xl"
            style={{ color: 'var(--color-fg-default)' }}
          >
            {article.summaryOneLine}
          </p>
        )}
      </header>

      {article.summaryThreeLine && (
        <section className="mb-10">
          <p
            className="text-[11px] mb-3 tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            세 줄 요약
          </p>
          <p
            className="text-[15px] leading-[1.75] whitespace-pre-wrap"
            style={{ color: 'var(--color-fg-default)' }}
          >
            {article.summaryThreeLine}
          </p>
        </section>
      )}

      {article.tags.length > 0 && (
        <section className="mb-10 flex flex-wrap gap-x-4 gap-y-2">
          {article.tags.map((t) => (
            <Link
              key={t}
              href={`/?q=${encodeURIComponent(t)}`}
              className="text-[12px]"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              <span className="hover:text-(--color-fg-default) transition-colors">#{t}</span>
            </Link>
          ))}
        </section>
      )}

      <section className="mb-14 flex flex-wrap gap-3">
        <Link
          href={askUrl}
          className="text-[13px] inline-flex items-center gap-2 px-4 py-2.5 rounded-full transition-all"
          style={{
            color: bar,
            border: `1px solid ${bar}`,
            background: `linear-gradient(to right, ${bar.replace(')', ' / 0.06)')}, transparent)`,
          }}
        >
          <span
            aria-hidden
            className="inline-block w-1 h-1 rounded-full"
            style={{ background: bar }}
          />
          이 글로 챗봇에 묻기
        </Link>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] inline-flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors"
          style={{
            color: 'var(--color-fg-muted)',
            border: '1px solid var(--color-line-strong)',
          }}
        >
          <span>원문 보기</span>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M3 9L9 3M9 3H4M9 3V8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </section>

      {related.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-6">
            <h2
              className="text-[11px] tracking-[0.2em] uppercase"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              관련 글
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
              {related.length}
            </span>
            <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
          </div>
          <ul className="space-y-6">
            {related.map((r) => {
              const rBar = SOURCE_BAR[r.source.provider] ?? SOURCE_BAR.rss_generic;
              return (
                <li key={r.id}>
                  <Link
                    href={`/articles/${r.id}`}
                    className="block group relative pl-4"
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-1 bottom-1 w-px"
                      style={{ background: 'var(--color-line-strong)' }}
                    />
                    <div className="flex items-center gap-2 mb-1 text-[12px]">
                      <span style={{ color: rBar }} className="tracking-wide">
                        {r.source.name}
                      </span>
                      <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                      <span style={{ color: 'var(--color-fg-muted)' }}>
                        {relativeTime(r.publishedAt)}
                      </span>
                    </div>
                    <p
                      className="text-[15px] leading-snug transition-colors"
                      style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}
                    >
                      <span className="group-hover:text-(--color-fg-strong)">{r.title}</span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </motion.article>
  );
}
