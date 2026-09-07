'use client';

import { CATEGORIES, categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import { selectReadingBrief } from '@/lib/reading-brief';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ArticleDto } from './article-card';
import { RelativeTimeText } from './relative-time-text';

const INTERESTS_KEY = 'devbrief.interests.v1';

interface Props {
  articles: ArticleDto[];
  readSet: Set<string>;
  bookmarkSet?: Set<string>;
  onOpen: (id: string) => void;
  onBookmark?: (id: string) => void;
  onBrowse: () => void;
}

export function ReadingBrief({
  articles,
  readSet,
  bookmarkSet,
  onOpen,
  onBookmark,
  onBrowse,
}: Props) {
  const { lang } = useLang();
  const [interests, setInterests] = useState<string[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(INTERESTS_KEY) ?? '[]');
      if (Array.isArray(saved)) {
        setInterests([
          ...new Set(
            saved.filter(
              (key): key is string => typeof key === 'string' && Object.hasOwn(CATEGORIES, key),
            ),
          ),
        ]);
      }
    } catch {
      // 잘못된 설정이나 저장소 접근 실패가 글 읽기를 막지는 않는다.
    }
    setNow(Date.now());
  }, []);

  const choose = (next: string[]) => {
    setInterests(next);
    setNow(Date.now());
    try {
      localStorage.setItem(INTERESTS_KEY, JSON.stringify(next));
      setStorageUnavailable(false);
    } catch {
      setStorageUnavailable(true);
    }
  };

  const { items, candidateCount } =
    now === null
      ? { items: [], candidateCount: 0 }
      : selectReadingBrief(articles, interests, readSet, now);

  return (
    <section
      aria-labelledby="reading-brief-title"
      className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12"
    >
      <div className="min-w-0">
        <fieldset>
          <legend className="mb-3 text-base font-semibold text-(--color-fg-strong)">
            관심 분야
          </legend>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
            {[{ key: '', label: '전체' }, ...Object.values(CATEGORIES)].map(({ key, label }) => {
              const active = key ? interests.includes(key) : interests.length === 0;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    choose(
                      key
                        ? active
                          ? interests.filter((item) => item !== key)
                          : [...interests, key]
                        : [],
                    )
                  }
                  className="shrink-0 min-h-11 rounded-md border px-3 text-sm transition-colors hover:border-(--color-accent)"
                  style={{
                    borderColor: active ? 'var(--color-fg-strong)' : 'var(--color-line-strong)',
                    background: active ? 'var(--color-fg-strong)' : 'transparent',
                    color: active ? 'var(--color-bg-elevated)' : 'var(--color-fg-default)',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <p className="hidden lg:block mt-4 text-sm leading-relaxed text-(--color-fg-muted)">
          여러 분야를 골라도 좋아요. 선택은 이 브라우저에 기억해 둘게요.
        </p>
        {storageUnavailable && (
          <p role="status" className="mt-2 text-sm text-(--color-fg-default)">
            설정을 저장하지 못했어요. 이번 화면에서만 적용됩니다.
          </p>
        )}
        <details className="mt-2 lg:mt-4 border-t border-(--color-line) pt-2">
          <summary className="min-h-11 cursor-pointer py-3 text-sm text-(--color-fg-muted)">
            어떤 기준으로 골랐나요?
          </summary>
          <p className="pb-3 text-sm leading-relaxed text-(--color-fg-muted)">
            불러온 글 중 최근 7일에 발행된 안 읽은 글을 고릅니다. 관심 분야에 맞는 글을 최신순으로
            살피고, 서로 다른 출처를 먼저 보여줘요.
          </p>
        </details>
        <button
          type="button"
          onClick={onBrowse}
          className="hidden lg:inline-flex lg:items-center mt-2 min-h-11 text-sm font-semibold text-(--color-accent) hover:underline underline-offset-4"
        >
          개발 뉴스 모두 보기
        </button>
      </div>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="reading-brief-title"
            className="text-xl font-bold tracking-[-0.02em] text-(--color-fg-strong)"
          >
            지금 읽을 글
          </h2>
          <p role="status" className="text-sm text-(--color-fg-muted)">
            {now !== null && `조건에 맞는 ${candidateCount}편 중 ${items.length}편`}
          </p>
        </div>
        {now === null ? (
          <p className="py-12 text-base text-(--color-fg-muted)">읽을 글을 고르고 있어요.</p>
        ) : items.length === 0 ? (
          <div className="border-y border-(--color-line) py-8">
            <h3 className="text-xl font-bold text-(--color-fg-strong)">
              {interests.length
                ? '이 분야에서 새로 읽을 글이 없어요.'
                : '지금 추천할 새 글이 없어요.'}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-(--color-fg-default)">
              불러온 최근 7일 글에서 조건에 맞는 안 읽은 글을 찾지 못했어요. 다른 분야나 이전 글도
              둘러보세요.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {interests.length > 0 && (
                <button
                  type="button"
                  onClick={() => choose([])}
                  className="min-h-11 rounded-md bg-(--color-fg-strong) px-4 text-sm font-semibold text-white"
                >
                  모든 분야 보기
                </button>
              )}
              <button
                type="button"
                onClick={onBrowse}
                className="min-h-11 px-3 text-sm font-semibold text-(--color-accent-strong)"
              >
                이전 글 둘러보기
              </button>
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {items.map((article, index) => {
              const title = pickTitle(article, lang).primary;
              const category = categoryOf(article);
              const saved = bookmarkSet?.has(article.id) ?? false;
              return (
                <li
                  key={article.id}
                  className={
                    index === 0
                      ? 'border-b border-(--color-line-strong) pb-8 pt-2'
                      : 'border-b border-(--color-line) py-6'
                  }
                >
                  <article aria-label={title}>
                    <div className="mb-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-(--color-fg-muted)">
                      <span className="font-semibold text-(--color-accent-strong)">
                        {category.label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{article.source.name}</span>
                      <span aria-hidden="true">·</span>
                      <RelativeTimeText iso={article.publishedAt} />
                    </div>
                    <h3
                      className={`${index === 0 ? 'text-2xl sm:text-3xl' : 'text-xl'} font-semibold leading-snug tracking-[-0.02em] text-(--color-fg-strong)`}
                    >
                      <Link
                        href={`/articles/${article.id}`}
                        onClick={() => onOpen(article.id)}
                        className="hover:underline underline-offset-4"
                      >
                        {title}
                      </Link>
                    </h3>
                    <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-(--color-fg-default)">
                      {article.summaryOneLine || '아직 요약이 없어요. 글을 열어 내용을 확인하세요.'}
                    </p>
                    {article.summaryThreeLine && (
                      <details className="mt-3">
                        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-(--color-accent-strong)">
                          요약 더 읽기
                        </summary>
                        <p className="max-w-[68ch] whitespace-pre-line pb-3 text-base leading-relaxed text-(--color-fg-default)">
                          {article.summaryThreeLine}
                        </p>
                      </details>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/articles/${article.id}`}
                        onClick={() => onOpen(article.id)}
                        className="inline-flex min-h-11 items-center rounded-md bg-(--color-fg-strong) px-4 text-sm font-semibold text-white"
                      >
                        글 읽기
                      </Link>
                      {onBookmark && (
                        <button
                          type="button"
                          aria-pressed={saved}
                          onClick={() => onBookmark(article.id)}
                          className="min-h-11 rounded-md border border-(--color-line-strong) px-4 text-sm font-semibold text-(--color-fg-strong) hover:bg-(--color-bg-elevated)"
                        >
                          {saved ? '저장됨' : '나중에 읽기'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpen(article.id)}
                        className="min-h-11 px-3 text-sm text-(--color-fg-muted) hover:underline underline-offset-4"
                      >
                        읽음으로 표시
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
