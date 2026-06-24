'use client';

import { categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import { readTracking } from '@/lib/read-tracking';
import { relativeTime } from '@/lib/relative-time';
import { sourceColor } from '@/lib/source-colors';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect } from 'react';
import type { ArticleDto } from './article-card';
import { SectionHeader } from './section-header';

function readingMinutes(article: {
  title: string;
  summaryThreeLine: string | null;
  summaryOneLine: string | null;
}): number {
  const length =
    (article.summaryThreeLine?.length ?? 0) * 6 +
    (article.summaryOneLine?.length ?? 0) * 4 +
    (article.title?.length ?? 0);
  return Math.max(2, Math.round(length / 400));
}

interface Props {
  article: ArticleDto;
  related: ArticleDto[];
}

export function ArticleDetail({ article, related }: Props) {
  const { lang } = useLang();
  const cat = categoryOf(article.tags);
  const dot = sourceColor(article.source.provider);
  const minutes = readingMinutes(article);
  const { primary: heading, secondary: original } = pickTitle(article, lang);
  const hasOriginal = !!original;
  const summaryLines = (article.summaryThreeLine ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  useEffect(() => {
    readTracking.add(article.id);
  }, [article.id]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
    >
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[12.5px] mb-7 transition-colors hover:text-(--color-fg-default)"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        <span aria-hidden>←</span> 오늘의 흐름
      </Link>

      {/* 헤더 */}
      <header className="mb-7">
        <div className="flex items-center gap-2 mb-4 text-[12.5px] flex-wrap">
          <span
            className="px-2 py-0.5 rounded-full text-[11.5px]"
            style={{ color: cat.color, background: cat.soft, fontWeight: 700 }}
          >
            {cat.label}
          </span>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: dot }}
            aria-hidden
          />
          <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
            {article.source.name}
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>
            {relativeTime(article.publishedAt)}
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span className="tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
            원문 약 {minutes}분
          </span>
        </div>

        <h1
          className="text-[1.875rem] sm:text-[2.375rem] leading-[1.18] tracking-[-0.018em] break-keep"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 800 }}
        >
          {heading}
        </h1>
        {hasOriginal && (
          <p
            className="mt-2.5 text-[14px] leading-snug"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            {original}
          </p>
        )}

        {article.summaryOneLine && (
          <p
            className="mt-5 text-[1.0625rem] leading-[1.7] max-w-2xl"
            style={{ color: 'var(--color-fg-default)' }}
          >
            {article.summaryOneLine}
          </p>
        )}
      </header>

      {/* 대표 이미지 */}
      {article.imageUrl && (
        <div
          className="relative aspect-[16/9] overflow-hidden mb-9"
          style={{ borderRadius: 12, background: 'oklch(92% 0.01 290)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt={`${heading} 대표 이미지`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      )}

      {/* 핵심 요약 */}
      {summaryLines.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="핵심 요약" hint="자동 요약" />
          <ol
            className="flex flex-col gap-3 p-5 rounded-xl"
            style={{
              background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-line)',
            }}
          >
            {summaryLines.map((line, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr] gap-3 items-baseline">
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] tabular-nums shrink-0"
                  style={{
                    background: cat.color,
                    color: 'oklch(99% 0 0)',
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  className="text-[14.5px] leading-[1.65]"
                  style={{ color: 'var(--color-fg-default)' }}
                >
                  {line}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 태그 */}
      {article.tags.length > 0 && (
        <section className="mb-9 flex flex-wrap gap-2">
          {article.tags.map((t) => (
            <Link
              key={t}
              href={`/?tab=articles&q=${encodeURIComponent(t)}`}
              className="text-[12px] px-2.5 py-1 rounded-full transition-colors hover:bg-(--color-bg-sunken)"
              style={{
                color: 'var(--color-fg-muted)',
                border: '1px solid var(--color-line)',
              }}
            >
              #{t}
            </Link>
          ))}
        </section>
      )}

      {/* 원문 보기 CTA */}
      <section
        className="mb-12 flex items-center justify-between gap-4 flex-wrap p-5 rounded-xl"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-line)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="min-w-0">
          <p className="text-[13.5px]" style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}>
            전체 내용이 궁금하다면
          </p>
          <p className="text-[12.5px] mt-0.5 truncate" style={{ color: 'var(--color-fg-muted)' }}>
            {article.source.name} 원문에서 이어 읽기
          </p>
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[13px] inline-flex items-center gap-2 px-4 py-2.5 rounded-lg transition-opacity hover:opacity-90"
          style={{
            background: 'var(--color-accent)',
            color: 'oklch(99% 0 0)',
            fontWeight: 600,
          }}
        >
          원문 보기
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M3 9L9 3M9 3H4M9 3V8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </section>

      {/* 비슷한 글 — 백엔드 임베딩 코사인 유사도 추천 */}
      {related.length > 0 && (
        <section>
          <SectionHeader label="비슷한 글" count={related.length} hint="유사도 추천" />
          <ul>
            {related.map((r) => {
              const rCat = categoryOf(r.tags);
              const rDot = sourceColor(r.source.provider);
              return (
                <li key={r.id}>
                  <Link
                    href={`/articles/${r.id}`}
                    className="group grid grid-cols-[auto_1fr] gap-3 items-start py-3 border-b"
                    style={{ borderColor: 'var(--color-line)' }}
                  >
                    <span
                      aria-hidden
                      className="w-1 self-stretch rounded-full mt-0.5"
                      style={{ background: rCat.color, minHeight: 36 }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10.5px] px-1.5 py-px rounded-full"
                          style={{
                            color: rCat.color,
                            background: rCat.soft,
                            fontWeight: 700,
                          }}
                        >
                          {rCat.label}
                        </span>
                        <p
                          className="text-[14px] leading-snug truncate group-hover:underline underline-offset-2"
                          style={{
                            color: 'var(--color-fg-strong)',
                            fontWeight: 600,
                          }}
                        >
                          {r.titleKo ?? r.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[11.5px]">
                        <span
                          className="inline-block h-1 w-1 rounded-full"
                          style={{ background: rDot }}
                          aria-hidden
                        />
                        <span style={{ color: 'var(--color-fg-muted)' }}>{r.source.name}</span>
                        <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                        <span style={{ color: 'var(--color-fg-muted)' }}>
                          {relativeTime(r.publishedAt)}
                        </span>
                      </div>
                    </div>
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
