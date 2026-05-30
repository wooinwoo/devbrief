'use client';

import Link from 'next/link';
import { relativeTime } from '@/lib/relative-time';
import { Highlight } from './highlight';
import { useChat } from './chat-context';

export interface ArticleDto {
  id: string;
  title: string;
  url: string;
  summaryOneLine: string | null;
  summaryThreeLine: string | null;
  publishedAt: string;
  tags: string[];
  imageUrl: string | null;
  source: { name: string; provider: string };
}

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

function readingMinutes(article: { title: string; summaryOneLine: string | null }): number {
  const length = (article.title?.length ?? 0) + (article.summaryOneLine?.length ?? 0) * 8;
  return Math.max(1, Math.round(length / 600));
}

interface Props {
  article: ArticleDto;
  read?: boolean;
  onOpen?: () => void;
  onTagClick?: (tag: string) => void;
  query?: string;
  variant?: 'default' | 'featured' | 'compact';
}

export function ArticleCard({
  article,
  read = false,
  onOpen,
  onTagClick,
  query = '',
  variant = 'default',
}: Props) {
  const bar = SOURCE_BAR[article.source.provider] ?? SOURCE_BAR.rss_generic;
  const summary = article.summaryOneLine;
  const chat = useChat();
  const minutes = readingMinutes(article);

  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  const titleClass = isFeatured
    ? 'text-[1.625rem] sm:text-[1.875rem] leading-[1.2] tracking-[-0.012em]'
    : isCompact
      ? 'text-[15.5px] leading-[1.35] tracking-[-0.003em]'
      : 'text-[1.25rem] sm:text-[1.4375rem] leading-[1.3] tracking-[-0.007em]';

  const cardBg = isFeatured
    ? `linear-gradient(to right, ${bar.replace(')', ' / 0.07)')}, transparent 60%)`
    : `linear-gradient(to right, ${bar.replace(')', ' / 0.025)')}, transparent 40%)`;

  return (
    <article
      className={`group relative pl-5 -ml-5 transition-all duration-300 motion-safe:hover:-translate-y-px
        ${isCompact ? 'pb-5' : 'pb-7'}
        ${read ? 'opacity-55 hover:opacity-90' : ''}
      `}
      style={{
        background: cardBg,
        borderRadius: isFeatured ? 8 : undefined,
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-1 bottom-5 w-[2px]"
        style={{
          background: `linear-gradient(to bottom, ${bar} 0%, ${bar.replace(')', ' / 0.4)')} 70%, transparent 100%)`,
        }}
      />
      <span
        aria-hidden
        className="absolute left-0 top-1 bottom-5 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: bar,
          boxShadow: `0 0 12px ${bar}, 0 0 4px ${bar}`,
        }}
      />

      <Link
        href={`/articles/${article.id}`}
        onClick={onOpen}
        className="block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--color-line-strong) focus-visible:rounded"
      >
        <div className="flex items-center gap-2 mb-2.5 text-[12.5px] flex-wrap">
          {!read && (
            <span
              aria-label="안 본 글"
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: bar, boxShadow: `0 0 8px ${bar}` }}
            />
          )}
          <span style={{ color: bar, fontWeight: 600 }} className="tracking-wide">
            {article.source.name}
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>{relativeTime(article.publishedAt)}</span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span className="tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
            {minutes}분 읽기
          </span>
        </div>
        <h2
          className={`${titleClass} transition-colors`}
          style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
        >
          <span className="group-hover:text-(--color-fg-strong) transition-colors">
            <Highlight text={article.title} query={query} />
          </span>
        </h2>
        {summary && !isCompact && (
          <p
            className="mt-3 leading-[1.65] text-[15px]"
            style={{ color: 'var(--color-fg-default)' }}
          >
            <Highlight text={summary} query={query} />
          </p>
        )}
      </Link>

      {!isCompact && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {article.tags.slice(0, 4).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTagClick?.(t)}
              className="text-[12px] transition-colors"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              <span className="hover:text-(--color-fg-strong)">#{t}</span>
            </button>
          ))}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => chat?.ask(`${article.title} 에 대해 설명해줘`)}
            className="text-[12px] inline-flex items-center gap-1.5 transition-opacity opacity-70 group-hover:opacity-100"
            style={{ color: bar, fontWeight: 500 }}
          >
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: bar, boxShadow: `0 0 4px ${bar}` }}
            />
            챗봇에 묻기
          </button>
        </div>
      )}
    </article>
  );
}
