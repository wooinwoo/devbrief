'use client';

import { categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import { relativeTime } from '@/lib/relative-time';
import { sourceColor } from '@/lib/source-colors';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Fragment } from 'react';
import type { ArticleDto } from './article-card';

interface Props {
  article: ArticleDto;
  read?: boolean;
  onOpen?: () => void;
}

export function FeaturedArticle({ article, read = false, onOpen }: Props) {
  const { lang } = useLang();
  const dot = sourceColor(article.source.provider);
  const cat = categoryOf(article.tags);
  const { primary, secondary } = pickTitle(article, lang);

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className={`relative overflow-hidden rounded-2xl mb-9 ${read ? 'opacity-70' : ''}`}
      style={{ background: 'var(--color-accent-soft)' }}
    >
      {/* 좌측 카테고리 컬러 바 */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ background: cat.color }}
      />

      <Link
        href={`/articles/${article.id}`}
        onClick={onOpen}
        className="group block focus-visible:outline-none p-6 sm:p-7 pl-7 sm:pl-9"
      >
        {/* 라벨: 카테고리 + 오늘의 머리기사 */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="px-2 py-0.5 rounded-full text-[11px]"
            style={{ color: cat.color, background: 'oklch(100% 0 0 / 0.6)', fontWeight: 700 }}
          >
            {cat.label}
          </span>
          <span
            className="text-[11px] tracking-[0.18em]"
            style={{ color: cat.color, fontWeight: 700 }}
          >
            오늘의 머리기사
          </span>
        </div>

        <div
          className={`grid gap-x-8 gap-y-4 ${article.imageUrl ? 'md:grid-cols-[1.55fr_1fr] items-center' : ''}`}
        >
          <div>
            <h2
              className="text-[1.5rem] sm:text-[1.875rem] lg:text-[2.125rem] leading-[1.14] tracking-[-0.018em] break-keep mb-2"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 800 }}
            >
              <span
                className="group-hover:underline underline-offset-[6px] decoration-2"
                style={{ textDecorationColor: cat.color }}
              >
                {primary}
              </span>
            </h2>
            {secondary && (
              <p
                className="text-[12.5px] mb-3 tracking-wide"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                {secondary}
              </p>
            )}

            {article.summaryOneLine && (
              <p
                className="text-[14.5px] leading-[1.65] mb-4 max-w-xl"
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
              <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
                {article.source.name}
              </span>
              <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
              <span style={{ color: 'var(--color-fg-muted)' }}>
                {relativeTime(article.publishedAt)}
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
              className="relative aspect-[16/10] overflow-hidden order-first md:order-last"
              style={{
                borderRadius: 12,
                background: 'oklch(92% 0.01 290)',
                boxShadow: '0 1px 2px oklch(0% 0 0 / 0.08), 0 8px 24px -8px oklch(0% 0 0 / 0.18)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              {/* 테두리 안쪽 미세 링 — 검은 og 이미지가 면에 박혀 보이게 */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-[12px] pointer-events-none"
                style={{ boxShadow: 'inset 0 0 0 1px oklch(0% 0 0 / 0.08)' }}
              />
            </div>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
