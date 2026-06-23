'use client';

import { relativeTime } from '@/lib/relative-time';
import Link from 'next/link';
import { Highlight } from './highlight';

export interface ArticleDto {
  id: string;
  title: string;
  titleKo?: string | null; // 영문 글이면 한국어 자동 번역, 한국어 글이면 null
  url: string;
  summaryOneLine: string | null;
  summaryThreeLine: string | null;
  publishedAt: string;
  tags: string[];
  imageUrl: string | null;
  language?: 'ko' | 'en' | 'mixed' | string;
  source: { name: string; provider: string };
}

// 소스마다 다른 색을 쓰던 V1 → 잭 톤 정돈: 모든 카드 회색 톤으로 통일,
// 소스 이름 옆 작은 점(dot)에만 brand 색을 남겨 구분.
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

// 좌측 vertical bar 는 회색 단색 (모든 카드 동일)
const BAR_GRAY = 'oklch(75% 0.008 250)';

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
  const dot = SOURCE_DOT[article.source.provider] ?? SOURCE_DOT.rss_generic;
  const summary = article.summaryOneLine;
  const minutes = readingMinutes(article);

  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  const titleClass = isFeatured
    ? 'text-[1.625rem] sm:text-[1.875rem] leading-[1.2] tracking-[-0.012em]'
    : isCompact
      ? 'text-[15.5px] leading-[1.35] tracking-[-0.003em]'
      : 'text-[1.25rem] sm:text-[1.4375rem] leading-[1.3] tracking-[-0.007em]';

  return (
    <article
      className={`group relative pl-5 -ml-5 min-w-0 transition-all duration-300 motion-safe:hover:-translate-y-px
        ${isCompact ? 'pb-5' : 'pb-7'}
        ${read ? 'opacity-55 hover:opacity-90' : ''}
      `}
    >
      <span
        aria-hidden
        className="absolute left-0 top-1 bottom-5 w-px transition-colors"
        style={{
          background: BAR_GRAY,
        }}
      />

      <Link
        href={`/articles/${article.id}`}
        onClick={onOpen}
        className="block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--color-line-strong) focus-visible:rounded"
      >
        <div className="flex items-center gap-2 mb-2.5 text-[12.5px] flex-wrap">
          {!read && (
            <>
              <span className="sr-only">안 본 글</span>
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: dot }}
              />
            </>
          )}
          <span
            style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}
            className="tracking-wide"
          >
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
        <h2
          className={`${titleClass} transition-colors break-keep`}
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
        </div>
      )}
    </article>
  );
}
