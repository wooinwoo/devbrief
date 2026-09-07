'use client';

import { API_BASE } from '@/lib/api';
import { BATCH_MAX_IDS, bookmarks } from '@/lib/bookmark';
import { filterArticles } from '@/lib/filter-articles';
import { readTracking } from '@/lib/read-tracking';
import type { ArticleListItem, ArticleSourceRef } from '@devbrief/shared';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { ArticleDto } from './article-card';
import { BriefIcon } from './brief-icon';
import { SearchField } from './filter-sidebar';
import { Pagination } from './pagination';
import { SavedArticleRow } from './saved-article-row';

/**
 * GET /articles/batch 의 와이어 계약(@devbrief/shared ArticleListItem)이 단일 소스 —
 * 다만 과거 수집분의 tags/source 누락(null)에 대비해 그 두 필드만 느슨하게 받는다 (감사 c58).
 */
type DbArticle = Omit<ArticleListItem, 'tags' | 'source'> & {
  tags: string[] | null;
  source: ArticleSourceRef | null;
};

function mapDbToDto(d: DbArticle): ArticleDto {
  return {
    id: d.id,
    title: d.title,
    titleKo: d.titleKo,
    url: d.url,
    summaryOneLine: d.summaryOneLine,
    summaryThreeLine: d.summaryThreeLine,
    publishedAt: d.publishedAt,
    tags: d.tags ?? [],
    imageUrl: d.imageUrl,
    language: d.language,
    source: d.source ?? { name: '출처 미상', provider: 'rss_generic' },
  };
}

type Status = 'idle' | 'loading' | 'error';
type Sort = 'newest' | 'oldest' | 'saved';
const PER_PAGE = 20;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * 북마크 모아보기 — localStorage 의 북마크 id 를 읽어 글 배치 API 로 한 번에 조회한다.
 * 메인 목록과 달리 전체 글 로드에 의존하지 않으므로, 목록에서 사라진 과거 글도
 * 저장돼 있으면 그대로 불러온다. 클라이언트 전용 (localStorage 접근).
 */
export function BookmarksView() {
  const [status, setStatus] = useState<Status>('loading');
  const [articles, setArticles] = useState<ArticleDto[]>([]);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  // 서버가 "없다"고 확인해 준 id — 삭제된 글로 보고 해제만 가능하게 노출
  const [missingIds, setMissingIds] = useState<string[]>([]);
  // 청크 조회 자체가 실패(네트워크/5xx)한 id 개수 — 해제 유도 없이 재시도만 안내
  const [failedCount, setFailedCount] = useState(0);
  const [query, setQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('saved');
  const [page, setPage] = useState(1);

  const fetchBookmarked = useCallback(async () => {
    const ids = [...bookmarks.load()];
    setReadSet(readTracking.load());

    if (ids.length === 0) {
      setArticles([]);
      setMissingIds([]);
      setFailedCount(0);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    // 상한(BATCH_MAX_IDS, 서버 캡과 동일) 단위로 나눠 배치 엔드포인트를 호출한다.
    // 단건 N회 → 청크 1회로 줄여 N+1 호출을 피한다.
    // allSettled 로 일부 청크가 실패해도 성공분은 렌더하고, 전부 실패할 때만 에러.
    const chunks = chunk(ids, BATCH_MAX_IDS);
    const settled = await Promise.allSettled(
      chunks.map(async (group) => {
        const qs = group.map(encodeURIComponent).join(',');
        const res = await fetch(`${API_BASE}/articles/batch?ids=${qs}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`batch fetch failed: ${res.status}`);
        return (await res.json()) as DbArticle[];
      }),
    );

    const anyFulfilled = settled.some((r) => r.status === 'fulfilled');
    // 청크가 전부 실패하면 부분 데이터가 없으므로 에러 상태로.
    if (!anyFulfilled) {
      setStatus('error');
      return;
    }

    // missing(삭제 추정) 판정은 해당 청크 조회가 성공했을 때만 내린다.
    // 실패한 청크의 id 를 missing 으로 섞으면 일시 장애가 '해제' 유도로 이어져
    // 유효한 북마크를 영구 삭제하게 만든다 — 실패분은 개수만 세서 재시도 배너로.
    const fetched: DbArticle[] = [];
    const missing: string[] = [];
    let failed = 0;
    settled.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        fetched.push(...result.value);
        const returnedIds = new Set(result.value.map((d) => d.id));
        missing.push(...chunks[i].filter((id) => !returnedIds.has(id)));
      } else {
        failed += chunks[i].length;
      }
    });

    // Set의 삽입 순서가 저장 순서다. API 반환 순서와 무관하게 최근 저장부터 보관한다.
    const savedOrder = new Map(ids.map((id, index) => [id, index]));
    const found = fetched
      .map(mapDbToDto)
      .sort((a, b) => (savedOrder.get(b.id) ?? 0) - (savedOrder.get(a.id) ?? 0));

    setArticles(found);
    setMissingIds(missing);
    setFailedCount(failed);
    setStatus('idle');
  }, []);

  useEffect(() => {
    void fetchBookmarked();
  }, [fetchBookmarked]);

  const handleUnbookmark = useCallback((id: string) => {
    bookmarks.toggle(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setMissingIds((prev) => prev.filter((m) => m !== id));
  }, []);

  const handleToggleRead = useCallback((id: string) => {
    setReadSet(readTracking.toggle(id));
  }, []);

  const total = articles.length + missingIds.length + failedCount;
  const unreadCount = articles.filter((article) => !readSet.has(article.id)).length;
  const filtered = filterArticles(articles, { query, hideRead: unreadOnly }, readSet);
  if (sort !== 'saved') {
    filtered.sort((a, b) =>
      sort === 'oldest'
        ? a.publishedAt.localeCompare(b.publishedAt)
        : b.publishedAt.localeCompare(a.publishedAt),
    );
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const search = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <section className="saved-library" aria-busy={status === 'loading'}>
      <div className="library-heading">
        <div>
          <h1>저장한 글</h1>
          <p>다음에 읽을 이야기, 여기 모아 두었어요.</p>
        </div>
        {status === 'idle' && total > 0 && (
          <div className="library-counts">
            <span>
              저장한 글<strong>{total}</strong>
            </span>
            <span>
              안 읽은 글<strong>{unreadCount}</strong>
            </span>
          </div>
        )}
      </div>
      <p className="library-device-note">
        저장한 글과 읽음 기록은 지금 사용하는 브라우저에 보관돼요.
      </p>

      {status === 'idle' && articles.length > 0 && (
        <div className="saved-toolbar">
          <div className="saved-filters">
            <div className="saved-search">
              <SearchField value={query} onChange={search} placeholder="저장한 글 검색" />
            </div>
            <button
              type="button"
              aria-pressed={unreadOnly}
              onClick={() => {
                setUnreadOnly((value) => !value);
                setPage(1);
              }}
              className="library-button unread-filter"
              style={{
                color: unreadOnly ? 'var(--color-accent-strong)' : 'var(--color-fg-default)',
                background: unreadOnly ? 'var(--color-bg-sunken)' : undefined,
                borderColor: unreadOnly ? 'var(--color-accent)' : undefined,
              }}
            >
              <BriefIcon name="check" size={17} /> 안 읽은 글만
            </button>
            <select
              aria-label="저장한 글 정렬"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as Sort);
                setPage(1);
              }}
              className="library-sort"
            >
              <option value="newest">최신 발행순</option>
              <option value="oldest">오래된 발행순</option>
              <option value="saved">최근 저장순</option>
            </select>
          </div>
          <p role="status" className="saved-result-count">
            {query || unreadOnly
              ? `조건에 맞는 글 ${filtered.length}개`
              : `전체 ${articles.length}개`}
          </p>
        </div>
      )}

      {status === 'loading' && (
        <div className="library-loading" role="status">
          <p>저장한 글을 불러오는 중이에요.</p>
          <div aria-hidden="true">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="py-16">
          <p className="text-[14px] mb-4" style={{ color: 'var(--color-fg-default)' }}>
            글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={() => void fetchBookmarked()}
            className="min-h-[44px] px-4 rounded-lg text-[14px] transition-colors hover:bg-(--color-bg-elevated)"
            style={{
              border: '1px solid var(--color-line-strong)',
              color: 'var(--color-fg-strong)',
              fontWeight: 600,
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {status === 'idle' && failedCount > 0 && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 flex-wrap mb-4 px-4 py-3 rounded-lg"
          style={{ border: '1px solid var(--color-line-strong)' }}
        >
          <p className="text-[13.5px]" style={{ color: 'var(--color-fg-default)' }}>
            북마크 {failedCount}개를 불러오지 못했어요. 저장은 그대로 남아 있어요.
          </p>
          <button
            type="button"
            onClick={() => void fetchBookmarked()}
            className="min-h-[44px] px-4 rounded-lg text-[13px] transition-colors hover:bg-(--color-bg-elevated)"
            style={{
              border: '1px solid var(--color-line-strong)',
              color: 'var(--color-fg-strong)',
              fontWeight: 600,
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {status === 'idle' && total === 0 && failedCount === 0 && (
        <div className="library-empty">
          <span className="library-empty-icon">
            <BriefIcon name="bookmark" size={30} />
          </span>
          <p
            className="text-[16px] mb-2"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
          >
            아직 저장한 글이 없어요.
          </p>
          <p className="text-[14px] mb-6" style={{ color: 'var(--color-fg-muted)' }}>
            마음에 드는 글에서 저장 버튼을 누르면 여기에 모여요.
          </p>
          <Link
            href="/?tab=articles"
            className="library-button library-primary"
            style={{
              border: '1px solid var(--color-line-strong)',
              color: 'var(--color-fg-strong)',
              fontWeight: 600,
            }}
          >
            개발 뉴스 둘러보기
          </Link>
        </div>
      )}

      {status === 'idle' && total > 0 && (
        <>
          {articles.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-base text-(--color-fg-default)">조건에 맞는 저장 글이 없어요.</p>
              <button
                type="button"
                onClick={() => {
                  search('');
                  setUnreadOnly(false);
                }}
                className="mt-3 min-h-11 px-4 rounded-lg border border-(--color-line-strong) text-sm hover:bg-(--color-bg-sunken)"
              >
                검색·필터 초기화
              </button>
            </div>
          )}
          <ul className="saved-list" aria-label="저장한 글 목록">
            {visible.map((a) => (
              <SavedArticleRow
                key={a.id}
                article={a}
                read={readSet.has(a.id)}
                onBookmark={handleUnbookmark}
                onToggleRead={handleToggleRead}
                onTagClick={search}
              />
            ))}
          </ul>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onChange={(next) => {
              setPage(next);
              window.scrollTo({ top: 0 });
            }}
          />
          <ul className="flex flex-col" aria-label="불러올 수 없는 저장 글">
            {missingIds.length > 0 &&
              missingIds.map((id) => (
                <li
                  key={id}
                  className="flex items-center justify-between gap-3 py-3.5 border-b"
                  style={{ borderColor: 'var(--color-line)' }}
                >
                  <span className="text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
                    더 이상 불러올 수 없는 글이에요.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUnbookmark(id)}
                    aria-label="북마크 해제"
                    className="min-h-[44px] px-3 text-[12px] transition-colors hover:text-(--color-fg-strong)"
                    style={{ color: 'var(--color-fg-subtle)', fontWeight: 600 }}
                  >
                    해제
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
