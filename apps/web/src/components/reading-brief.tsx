'use client';

import { CATEGORIES, categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import { selectReadingBrief } from '@/lib/reading-brief';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ArticleDto } from './article-card';
import { BriefIcon } from './brief-icon';
import { CoverImage } from './cover-image';
import { RelativeTimeText } from './relative-time-text';

const INTERESTS_KEY = 'devbrief.interests.v1';

function readableSummary(text: string | null) {
  const summary = text?.trim();
  return summary && !/^(?:기사|Article) URL:/i.test(summary) ? summary : null;
}

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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

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

  const { items } =
    now === null ? { items: [] } : selectReadingBrief(articles, interests, readSet, now);

  return (
    <section aria-labelledby="reading-brief-title" className="reading-brief">
      <div className="reading-brief-toolbar">
        <h2 id="reading-brief-title">지금 읽을 글</h2>
        <details className="reading-preferences">
          <summary>
            <span>관심 분야</span>
            <span className="reading-interest-value">
              {interests.length === 1
                ? CATEGORIES[interests[0]].label
                : interests.length
                  ? `${interests.length}개 선택`
                  : '전체'}
            </span>
          </summary>
          <div className="reading-preferences-panel">
            <fieldset>
              <legend className="sr-only">관심 분야 선택</legend>
              <div className="reading-interest-options">
                {[{ key: '', label: '전체' }, ...Object.values(CATEGORIES)].map(
                  ({ key, label }) => {
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
                      >
                        {label}
                      </button>
                    );
                  },
                )}
              </div>
            </fieldset>
            <p>여러 분야를 골라도 좋아요. 선택은 이 브라우저에 기억해 둘게요.</p>
            <p>
              최근 7일의 안 읽은 글 중 관심 분야에 맞는 최신 글을 고르고, 서로 다른 출처를 먼저
              보여줘요.
            </p>
            {storageUnavailable && (
              <p role="status">설정을 저장하지 못했어요. 이번 화면에서만 적용됩니다.</p>
            )}
          </div>
        </details>
      </div>
      {now === null ? (
        <p className="reading-brief-empty" role="status">
          읽을 글을 고르고 있어요.
        </p>
      ) : items.length === 0 ? (
        <div className="reading-brief-empty">
          <h3>
            {interests.length
              ? '이 분야에서 새로 읽을 글이 없어요.'
              : '지금 추천할 새 글이 없어요.'}
          </h3>
          <p>
            최근 7일 글에서 조건에 맞는 안 읽은 글을 찾지 못했어요. 다른 분야나 이전 글도
            둘러보세요.
          </p>
          {interests.length > 0 && (
            <button type="button" onClick={() => choose([])} className="text-link">
              모든 분야 보기
            </button>
          )}
        </div>
      ) : (
        <ol className="reading-brief-list">
          {items.map((article, index) => {
            const title = pickTitle(article, lang).primary;
            const category = categoryOf(article);
            const saved = bookmarkSet?.has(article.id) ?? false;
            const excerpt = readableSummary(article.summaryOneLine);
            const fullSummary = readableSummary(article.summaryThreeLine);
            const isExpanded = expanded.has(article.id);
            const summaryId = `reading-summary-${article.id}`;
            return (
              <li key={article.id}>
                <article aria-label={title}>
                  <div className="reading-story-heading">
                    <div className="reading-story-copy">
                      <div className="reading-story-meta">
                        <span>{category.label}</span>
                        <span aria-hidden="true">·</span>
                        <span>{article.source.name}</span>
                        <span aria-hidden="true">·</span>
                        <RelativeTimeText iso={article.publishedAt} />
                      </div>
                      <h3>
                        <Link href={`/articles/${article.id}`} onClick={() => onOpen(article.id)}>
                          {title}
                        </Link>
                      </h3>
                    </div>
                    {article.imageUrl && (
                      <Link
                        href={`/articles/${article.id}`}
                        onClick={() => onOpen(article.id)}
                        className="reading-story-cover"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <CoverImage
                          src={article.imageUrl}
                          label={article.source.name}
                          priority={index === 0}
                        />
                      </Link>
                    )}
                  </div>
                  {excerpt && <p className="reading-story-excerpt">{excerpt}</p>}
                  <div className="reading-story-actions">
                    {fullSummary && (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={summaryId}
                        className="reading-summary-toggle"
                        onClick={() =>
                          setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(article.id)) next.delete(article.id);
                            else next.add(article.id);
                            return next;
                          })
                        }
                      >
                        {isExpanded ? '요약 접기' : '요약 더 읽기'}
                      </button>
                    )}
                    {onBookmark && (
                      <button
                        type="button"
                        aria-pressed={saved}
                        onClick={() => onBookmark(article.id)}
                      >
                        <BriefIcon name={saved ? 'check' : 'bookmark'} size={16} />
                        {saved ? '저장됨' : '저장'}
                      </button>
                    )}
                    <button type="button" onClick={() => onOpen(article.id)}>
                      읽음으로 표시
                    </button>
                  </div>
                  {fullSummary && (
                    <p id={summaryId} hidden={!isExpanded} className="reading-story-expanded">
                      {fullSummary}
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}
      <button type="button" onClick={onBrowse} className="text-link reading-browse">
        개발 뉴스 모두 보기
        <BriefIcon name="arrow" size={16} />
      </button>
    </section>
  );
}
