'use client';

import { readableSummary } from '@/lib/article-summary';
import { categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import Link from 'next/link';
import type { ArticleDto } from './article-card';
import { CoverImage } from './cover-image';
import { RelativeTimeText } from './relative-time-text';

interface Props {
  article: ArticleDto;
  read?: boolean;
  bookmarked?: boolean;
  onOpen?: () => void;
  onTagClick?: (tag: string) => void;
  onBookmark?: (id: string) => void;
  /** 읽음/안읽음 토글 — 넘기면 북마크 옆에 토글 버튼 노출 */
  onToggleRead?: (id: string) => void;
  /** 카테고리 칩 대신 표시할 배지들 (예: AI 탭의 모델·하네스) */
  badges?: Array<{ label: string; color: string }>;
}

/**
 * 제목, 요약, 출처 순서로 읽는 기사 목록.
 * 읽음 상태는 텍스트로 표시하고 저장 버튼은 별도 조작 영역에 둔다.
 */
export function ArticleRow({
  article,
  read = false,
  bookmarked = false,
  onOpen,
  onTagClick,
  onBookmark,
  onToggleRead,
  badges,
}: Props) {
  const { lang } = useLang();
  const cat = categoryOf(article);
  const { primary, secondary } = pickTitle(article, lang);
  const summary = readableSummary(article.summaryOneLine);

  return (
    <li
      className="brief-article-row group relative flex flex-col gap-2 border-b py-5 sm:flex-row sm:gap-4 sm:py-6"
      style={{ borderColor: 'var(--color-line)' }}
    >
      <div className="min-w-0 flex-1">
        {article.imageUrl && (
          <div className="article-row-cover">
            <CoverImage src={article.imageUrl} label={article.source.name} />
          </div>
        )}
        {/* 제목과 요약을 먼저 읽고 출처와 분류를 확인한다. */}
        <div>
          <Link href={`/articles/${article.id}`} onClick={onOpen} className="min-w-0">
            <h3 className="text-[20px] leading-[1.5] tracking-[-0.015em] break-keep text-(--color-fg-strong) transition-colors hover:text-(--color-accent-strong) line-clamp-3 font-semibold">
              {primary}
            </h3>
          </Link>
        </div>

        {/* 요약이 없으면 반대 언어 제목을 표시한다. */}
        {(summary || secondary) && (
          <Link
            href={`/articles/${article.id}`}
            onClick={onOpen}
            className="article-row-summary block mt-2 text-[16px] leading-[1.75] line-clamp-2"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            {summary ?? secondary}
          </Link>
        )}

        {/* 소스, 발행일, 읽음 상태와 태그 */}
        <div className="article-row-meta flex items-center gap-x-2 gap-y-1 mt-3 text-[13px] flex-wrap">
          <span style={{ color: 'var(--color-fg-muted)' }}>
            {badges?.length ? badges.map((badge) => badge.label).join(' · ') : cat.label}
          </span>
          <span aria-hidden style={{ color: 'var(--color-fg-subtle)' }}>
            ·
          </span>
          <span className="min-w-0">
            <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
              {article.source.name}
            </span>
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>
            <RelativeTimeText iso={article.publishedAt} />
          </span>
          {read && <span style={{ color: 'var(--color-fg-muted)' }}>읽음</span>}
          {article.tags.slice(0, 3).map((t) =>
            onTagClick ? (
              <button
                key={t}
                type="button"
                onClick={() => onTagClick(t)}
                className="min-h-11 sm:min-h-6 rounded px-1 -mx-0.5 transition-colors hover:bg-(--color-bg-sunken) hover:text-(--color-fg-default)"
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
        <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
          {onToggleRead && (
            <button
              type="button"
              onClick={() => onToggleRead(article.id)}
              aria-label={read ? '안읽음으로 표시' : '읽음으로 표시'}
              className="min-h-[44px] rounded-md px-3 text-[13px] transition-colors hover:bg-(--color-bg-sunken) hover:text-(--color-fg-strong)"
              style={{ color: 'var(--color-fg-subtle)', fontWeight: 600 }}
            >
              {read ? '안읽음' : '읽음'}
            </button>
          )}
          {onBookmark && (
            <button
              type="button"
              onClick={() => onBookmark(article.id)}
              aria-pressed={bookmarked}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-md px-3 text-[13px] whitespace-nowrap transition-colors hover:bg-(--color-bg-sunken)"
              style={{
                color: bookmarked ? 'var(--color-accent)' : 'var(--color-fg-muted)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M4 2.5h8a.5.5 0 0 1 .5.5v10.2a.3.3 0 0 1-.48.24L8 11l-4.02 2.94a.3.3 0 0 1-.48-.24V3a.5.5 0 0 1 .5-.5Z"
                  fill={bookmarked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              <span>{bookmarked ? '저장됨' : '저장'}</span>
            </button>
          )}
        </div>
      )}
    </li>
  );
}
