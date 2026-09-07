'use client';

import { categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import Link from 'next/link';
import { Fragment } from 'react';
import type { ArticleDto } from './article-card';
import { RelativeTimeText } from './relative-time-text';

interface Props {
  article: ArticleDto;
  read?: boolean;
  onOpen?: () => void;
}

export function FeaturedArticle({ article, read = false, onOpen }: Props) {
  const { lang } = useLang();
  const cat = categoryOf(article);
  const { primary, secondary } = pickTitle(article, lang);

  return (
    <article className="mb-9 border-b pb-8" style={{ borderColor: 'var(--color-line-strong)' }}>
      <Link
        href={`/articles/${article.id}`}
        onClick={onOpen}
        className="group block focus-visible:outline-offset-4"
      >
        <div
          className={`grid gap-x-8 gap-y-6 ${article.imageUrl ? 'md:grid-cols-[1.55fr_1fr] items-center' : ''}`}
        >
          <div>
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
            {secondary && (
              <p
                className="text-[13px] leading-relaxed mb-3"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                {secondary}
              </p>
            )}

            {article.summaryOneLine && (
              <p
                className="text-[16px] leading-[1.75] mt-4 mb-5 max-w-[65ch]"
                style={{ color: 'var(--color-fg-default)' }}
              >
                {article.summaryOneLine}
              </p>
            )}

            <div className="flex items-center gap-2 text-[12.5px] flex-wrap">
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
            <div
              className="relative aspect-[16/10] overflow-hidden rounded-md"
              style={{
                background: 'var(--color-bg-sunken)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
