'use client';

import { categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import { relativeTime } from '@/lib/relative-time';
import { sourceColor } from '@/lib/source-colors';
import Link from 'next/link';
import type { ArticleDto } from './article-card';

interface Props {
  article: ArticleDto;
  read?: boolean;
  bookmarked?: boolean;
  onOpen?: () => void;
  onTagClick?: (tag: string) => void;
  onBookmark?: (id: string) => void;
  /** 읽음/안읽음 토글 — 넘기면 북마크 옆에 토글 버튼 노출 */
  onToggleRead?: (id: string) => void;
  index?: number;
  /** 카테고리 칩 대신 표시할 배지들 (예: AI 탭의 모델·하네스) */
  badges?: Array<{ label: string; color: string }>;
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
  onToggleRead,
  index,
  badges,
}: Props) {
  const { lang } = useLang();
  const cat = categoryOf(article.tags);
  const dot = sourceColor(article.source.provider);
  const { primary, secondary } = pickTitle(article, lang);

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
          {badges && badges.length > 0 ? (
            <span className="shrink-0 mt-0.5 flex items-center gap-2">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1 text-[10.5px] whitespace-nowrap"
                  style={{ color: b.color, fontWeight: 700 }}
                >
                  <span
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: b.color }}
                  />
                  {b.label}
                </span>
              ))}
            </span>
          ) : (
            <span
              className="shrink-0 mt-0.5 text-[10.5px] px-1.5 py-0.5 rounded tracking-wide"
              style={{ background: cat.soft, color: cat.color, fontWeight: 700 }}
            >
              {cat.label}
            </span>
          )}
          <Link href={`/articles/${article.id}`} onClick={onOpen} className="min-w-0 flex-1">
            <span
              className="block text-[15px] leading-[1.4] tracking-[-0.005em] break-keep group-hover:text-(--color-accent-strong) transition-colors line-clamp-3"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
            >
              {primary}
            </span>
          </Link>
        </div>

        {/* 2행: 한 줄 요약 (없으면 반대 언어 제목) */}
        {(article.summaryOneLine || secondary) && (
          <Link
            href={`/articles/${article.id}`}
            onClick={onOpen}
            className="block mt-1 text-[13px] leading-[1.5] line-clamp-1"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            {article.summaryOneLine ?? secondary}
          </Link>
        )}

        {/* 3행: 소스 · 시간 · 태그 */}
        <div className="flex items-center gap-x-2 gap-y-1 mt-1.5 text-[11.5px] flex-wrap">
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
          {article.tags.slice(0, 3).map((t) =>
            onTagClick ? (
              <button
                key={t}
                type="button"
                onClick={() => onTagClick(t)}
                className="rounded px-1 -mx-0.5 transition-colors hover:bg-(--color-bg-sunken) hover:text-(--color-fg-default)"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                #{t}
              </button>
            ) : (
              <span key={t} style={{ color: 'var(--color-fg-subtle)' }}>
                #{t}
              </span>
            ),
          )}
        </div>
      </div>

      {/* 우측: 읽음 토글 + 북마크 */}
      {(onBookmark || onToggleRead) && (
        <div className="shrink-0 self-start flex items-center gap-1">
          {onToggleRead && (
            <button
              type="button"
              onClick={() => onToggleRead(article.id)}
              aria-label={read ? '안읽음으로 표시' : '읽음으로 표시'}
              className="min-h-[44px] px-2 text-[11.5px] transition-colors hover:text-(--color-fg-strong)"
              style={{ color: 'var(--color-fg-subtle)', fontWeight: 600 }}
            >
              {read ? '안읽음' : '읽음'}
            </button>
          )}
          {onBookmark && (
            <button
              type="button"
              onClick={() => onBookmark(article.id)}
              aria-label={bookmarked ? '북마크 해제' : '북마크'}
              className="grid place-items-center min-h-[44px] min-w-[44px] -mr-1 transition-opacity"
              style={{
                opacity: bookmarked ? 1 : 0.25,
                color: bookmarked ? 'var(--color-accent)' : 'var(--color-fg-muted)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M4 2.5h8a.5.5 0 0 1 .5.5v10.2a.3.3 0 0 1-.48.24L8 11l-4.02 2.94a.3.3 0 0 1-.48-.24V3a.5.5 0 0 1 .5-.5Z"
                  fill={bookmarked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </li>
  );
}
