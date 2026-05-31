'use client';

import Link from 'next/link';
import { relativeTime } from '@/lib/relative-time';
import { categoryOf } from '@/lib/category';
import type { ArticleDto } from './article-card';

const SOURCE_DOT: Record<string, string> = {
  geeknews: 'oklch(55% 0.16 160)',
  hackernews: 'oklch(62% 0.18 45)',
  devto: 'oklch(58% 0.18 290)',
  techcrunch: 'oklch(58% 0.21 15)',
  anthropic: 'oklch(62% 0.17 60)',
  kakao_tech: 'oklch(72% 0.16 90)',
  toss_tech: 'oklch(58% 0.18 250)',
  woowahan: 'oklch(64% 0.17 150)',
  naver_d2: 'oklch(58% 0.18 145)',
  rss_generic: 'oklch(58% 0.02 290)',
};

interface Props {
  article: ArticleDto;
  read?: boolean;
  bookmarked?: boolean;
  onOpen?: () => void;
  onTagClick?: (tag: string) => void;
  onBookmark?: (id: string) => void;
  index?: number;
}

/**
 * 2단 dense 행 — 1행: 카테고리 칩 + 제목 + (북마크/시간) / 2행: 소스 · 원제 · 태그.
 * 좌측에 카테고리 색 바로 "색으로 스캔" 가능.
 */
export function ArticleRow({
  article,
  read = false,
  bookmarked = false,
  onOpen,
  onTagClick,
  onBookmark,
  index,
}: Props) {
  const cat = categoryOf(article.tags);
  const dot = SOURCE_DOT[article.source.provider] ?? SOURCE_DOT.rss_generic;
  const hasKo = article.titleKo && article.title !== article.titleKo;

  return (
    <li
      className={`group relative flex gap-3.5 py-3.5 pl-4 pr-2 -ml-4 border-b transition-colors hover:bg-(--color-bg-elevated) ${
        read ? 'opacity-55 hover:opacity-90' : ''
      }`}
      style={{ borderColor: 'var(--color-line)' }}
    >
      {/* 좌측 카테고리 색 바 */}
      <span
        aria-hidden
        className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-full"
        style={{ background: cat.color, opacity: read ? 0.4 : 1 }}
      />

      {typeof index === 'number' && (
        <span
          className="shrink-0 tabular-nums text-[12px] w-5 text-right pt-0.5"
          style={{ color: 'var(--color-fg-subtle)', fontWeight: 500 }}
        >
          {index + 1}
        </span>
      )}

      <div className="min-w-0 flex-1">
        {/* 1행: 카테고리 칩 + 제목 */}
        <div className="flex items-start gap-2">
          <span
            className="shrink-0 mt-0.5 text-[10.5px] px-1.5 py-0.5 rounded tracking-wide"
            style={{ background: cat.soft, color: cat.color, fontWeight: 700 }}
          >
            {cat.label}
          </span>
          <Link
            href={`/articles/${article.id}`}
            onClick={onOpen}
            className="min-w-0 flex-1"
          >
            <span
              className="block text-[15px] leading-[1.4] tracking-[-0.005em] break-keep group-hover:text-(--color-accent-strong) transition-colors"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
            >
              {article.titleKo ?? article.title}
            </span>
          </Link>
        </div>

        {/* 2행: 소스 + 원제 + 시간 */}
        <div className="flex items-center gap-2 mt-1.5 pl-[3.25rem] text-[11.5px] flex-wrap">
          <span className="flex items-center gap-1.5 shrink-0">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: dot }}
            />
            <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
              {article.source.name}
            </span>
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>
            {relativeTime(article.publishedAt)}
          </span>
          {hasKo && (
            <>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span className="truncate max-w-[280px]" style={{ color: 'var(--color-fg-subtle)' }}>
                {article.title}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 우측: 북마크 */}
      {onBookmark && (
        <button
          type="button"
          onClick={() => onBookmark(article.id)}
          aria-label={bookmarked ? '북마크 해제' : '북마크'}
          className="shrink-0 self-start p-1 -mr-1 transition-opacity"
          style={{
            opacity: bookmarked ? 1 : 0.25,
            color: bookmarked ? 'var(--color-accent)' : 'var(--color-fg-muted)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M4 2.5h8a.5.5 0 0 1 .5.5v10.2a.3.3 0 0 1-.48.24L8 11l-4.02 2.94a.3.3 0 0 1-.48-.24V3a.5.5 0 0 1 .5-.5Z"
              fill={bookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </svg>
        </button>
      )}
    </li>
  );
}
