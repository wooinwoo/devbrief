'use client';

import Link from 'next/link';
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
  onTagClick?: (tag: string) => void;
  index?: number;
}

/**
 * dense 1-line list 카드.
 * 한 행에 dot + 소스 + 시간 + 제목 + 태그 (HN / Lobsters 톤).
 * hover 시 요약 미리보기.
 */
export function ArticleRow({
  article,
  read = false,
  onOpen,
  onTagClick,
  index,
}: Props) {
  const dot = SOURCE_DOT[article.source.provider] ?? SOURCE_DOT.rss_generic;
  return (
    <li
      className={`group relative grid grid-cols-[auto_auto_auto_1fr_auto] gap-3 items-baseline py-2.5 px-2 -mx-2 border-b transition-colors hover:bg-(--color-bg-elevated)/40 ${
        read ? 'opacity-50 hover:opacity-90' : ''
      }`}
      style={{ borderColor: 'var(--color-line)' }}
    >
      {typeof index === 'number' && (
        <span
          className="tabular-nums text-[12px] w-7 text-right shrink-0"
          style={{ color: 'var(--color-fg-subtle)', fontWeight: 500 }}
        >
          {index + 1}.
        </span>
      )}
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: read ? 'var(--color-line-strong)' : dot }}
      />
      <span
        className="text-[12px] tracking-wide shrink-0 w-[88px] truncate"
        style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}
        title={article.source.name}
      >
        {article.source.name}
      </span>

      <Link
        href={`/articles/${article.id}`}
        onClick={onOpen}
        className="min-w-0 block focus-visible:outline-none"
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <span
            className="text-[14.5px] tracking-[-0.005em] truncate group-hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
            title={article.title}
          >
            {article.title}
          </span>
          {article.summaryOneLine && (
            <span
              className="hidden lg:inline text-[12.5px] truncate min-w-0"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              — {article.summaryOneLine}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[11.5px]">
          {article.tags.slice(0, 4).map((t) => (
            <button
              key={t}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onTagClick?.(t);
              }}
              className="hover:text-(--color-fg-default) transition-colors"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              #{t}
            </button>
          ))}
        </div>
      </Link>

      <span
        className="tabular-nums text-[11.5px] shrink-0 self-baseline"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {relativeTime(article.publishedAt)}
      </span>
    </li>
  );
}
