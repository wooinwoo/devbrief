'use client';

import { categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import { MOCKS_ENABLED } from '@/lib/mocks-enabled';
import { readTracking } from '@/lib/read-tracking';
import Link from 'next/link';
import { useEffect } from 'react';
import type { ArticleDto } from './article-card';
import { ArticleRow } from './article-row';
import { RelativeTimeText } from './relative-time-text';
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
  const cat = categoryOf(article);
  const minutes = readingMinutes(article);
  const { primary: heading, secondary: original } = pickTitle(article, lang);
  const hasOriginal = !!original;
  const summaryLines = (article.summaryThreeLine ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  useEffect(() => {
    // dev 모드 mock 글(m1~)은 읽음 기록에서 제외 — localStorage 오염 방지
    if (MOCKS_ENABLED && /^m\d+$/.test(article.id)) return;
    readTracking.add(article.id);
  }, [article.id]);

  return (
    <article className="pb-12 sm:pb-16">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 text-[13px] mb-5 transition-colors hover:text-(--color-fg-default)"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        <span aria-hidden>←</span> 오늘의 흐름
      </Link>

      {/* 헤더 */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-4 text-[12.5px] flex-wrap">
          <span
            className="text-[12.5px]"
            style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
          >
            {cat.label}
          </span>
          <span aria-hidden style={{ color: 'var(--color-fg-subtle)' }}>
            ·
          </span>
          <span style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
            {article.source.name}
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>
            <RelativeTimeText iso={article.publishedAt} />
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span className="tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>
            원문 약 {minutes}분
          </span>
        </div>

        <h1
          className="text-[1.875rem] sm:text-[2.625rem] leading-[1.35] tracking-[-0.025em] break-keep"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          {heading}
        </h1>
        {hasOriginal && (
          <p
            className="mt-3 text-[14px] leading-relaxed"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            {original}
          </p>
        )}

        {article.summaryOneLine && (
          <p
            className="mt-6 text-[1.0625rem] leading-[1.8] max-w-2xl"
            style={{ color: 'var(--color-fg-default)' }}
          >
            {article.summaryOneLine}
          </p>
        )}
      </header>

      {/* 대표 이미지 */}
      {article.imageUrl && (
        <div
          className="relative aspect-[16/9] overflow-hidden rounded-md mb-10"
          style={{ background: 'var(--color-bg-sunken)' }}
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
          <ol className="flex flex-col gap-4 py-2">
            {summaryLines.map((line, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr] gap-3 items-baseline">
                <span
                  className="w-5 text-[12px] tabular-nums shrink-0"
                  style={{
                    color: 'var(--color-fg-subtle)',
                    fontWeight: 500,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  className="text-[15px] leading-[1.85]"
                  style={{ color: 'var(--color-fg-default)' }}
                >
                  {line}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 원문 본문 — 서버(CLI extract)에서 sanitize 된 HTML 만 렌더한다.
          contentHtml 은 ArticleExtractService 가 script/style/on* 핸들러/위험 링크를
          제거하고 허용 태그만 남긴 결과라 dangerouslySetInnerHTML 로 안전하게 표시 가능. */}
      {article.contentHtml && (
        <section className="mb-10">
          <SectionHeader label="원문 본문" hint={`출처 · ${article.source.name}`} />
          <div
            className="article-prose"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: contentHtml 은 서버(ArticleExtractService)에서 script/style/on*/위험 링크를 제거하고 허용 태그만 남긴 sanitize 결과다.
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />
          <p className="mt-5 text-[12.5px]" style={{ color: 'var(--color-fg-subtle)' }}>
            이 글은 {article.source.name} 의 원문을 정제해 보여드립니다. 저작권은 원저작자에게
            있습니다.
          </p>
        </section>
      )}

      {/* 태그 */}
      {article.tags.length > 0 && (
        <section className="mb-9 flex flex-wrap gap-2">
          {article.tags.map((t) => (
            <Link
              key={t}
              href={`/?tab=articles&q=${encodeURIComponent(t)}`}
              className="inline-flex min-h-11 items-center text-[13px] px-2.5 rounded-md transition-colors hover:bg-(--color-bg-sunken)"
              style={{
                color: 'var(--color-fg-muted)',
              }}
            >
              #{t}
            </Link>
          ))}
        </section>
      )}

      {/* 원문 보기 CTA */}
      <section
        className="mb-12 flex items-center justify-between gap-4 flex-wrap border-y py-6"
        style={{
          borderColor: 'var(--color-line-strong)',
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
          className="shrink-0 min-h-11 text-[13px] inline-flex items-center gap-2 px-4 py-2.5 rounded-md transition-opacity hover:opacity-90"
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
            {related.map((item) => (
              <ArticleRow key={item.id} article={item} />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
