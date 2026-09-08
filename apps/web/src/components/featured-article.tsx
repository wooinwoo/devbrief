'use client';

import { categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import Link from 'next/link';
import { Fragment } from 'react';
import type { ArticleDto } from './article-card';
import { BriefIcon } from './brief-icon';
import { CoverImage } from './cover-image';
import { RelativeTimeText } from './relative-time-text';

interface Props {
  article: ArticleDto;
  read?: boolean;
  bookmarked?: boolean;
  onBookmark?: (id: string) => void;
  onOpen?: () => void;
}

export function FeaturedArticle({
  article,
  read = false,
  bookmarked = false,
  onBookmark,
  onOpen,
}: Props) {
  const { lang } = useLang();
  const cat = categoryOf(article);
  const { primary } = pickTitle(article, lang);

  return (
    <article
      className="featured-reading mb-7 border-b pb-8"
      style={{ borderColor: 'var(--color-line-strong)' }}
    >
      <Link
        href={`/articles/${article.id}`}
        onClick={onOpen}
        className="group block focus-visible:outline-offset-4"
      >
        <div className="featured-reading-layout grid items-center gap-x-8 gap-y-6">
          <div className="min-w-0">
            <h2
              className="text-[1.625rem] sm:text-[2rem] lg:text-[2.25rem] leading-[1.35] tracking-[-0.025em] break-keep mb-2"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
            >
              <span
                className="group-hover:underline underline-offset-[6px] decoration-2"
                style={{ textDecorationColor: 'var(--color-accent)' }}
              >
                {primary}
              </span>
            </h2>

            {article.summaryOneLine && (
              <p
                className="text-[16px] leading-[1.75] mt-4 mb-5 max-w-[65ch]"
                style={{ color: 'var(--color-fg-default)' }}
              >
                {article.summaryOneLine}
              </p>
            )}

            <div className="flex items-center gap-2 text-[13px] flex-wrap">
              <span className="font-medium" style={{ color: 'var(--color-fg-muted)' }}>
                {cat.label}
              </span>
              <span aria-hidden style={{ color: 'var(--color-fg-subtle)' }}>
                ·
              </span>
              {read && <span style={{ color: 'var(--color-fg-muted)' }}>읽음</span>}
              {!read && <span className="sr-only">안 본 글</span>}
              <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
                {article.source.name}
              </span>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>
                <RelativeTimeText iso={article.publishedAt} />
              </span>
              {article.tags.slice(0, 3).map((t) => (
                <Fragment key={t}>
                  <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                  <span style={{ color: 'var(--color-fg-subtle)' }}>#{t}</span>
                </Fragment>
              ))}
            </div>
          </div>

          {article.imageUrl && (
            <div className="featured-reading-cover w-full max-w-[240px] justify-self-center [&_img]:object-contain">
              <CoverImage src={article.imageUrl} label={article.source.name} priority />
            </div>
          )}
        </div>
      </Link>
      {onBookmark && (
        <button
          type="button"
          aria-pressed={bookmarked}
          onClick={() => onBookmark(article.id)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-(--color-line-strong) px-3 text-sm text-(--color-accent-strong) hover:bg-(--color-accent-soft)"
        >
          <BriefIcon name={bookmarked ? 'check' : 'bookmark'} size={16} />
          {bookmarked ? '저장됨' : '저장'}
        </button>
      )}
    </article>
  );
}
