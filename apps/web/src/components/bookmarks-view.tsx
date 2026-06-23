'use client';

import { API_BASE } from '@/lib/api';
import { bookmarks } from '@/lib/bookmark';
import { readTracking } from '@/lib/read-tracking';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { ArticleDto } from './article-card';
import { ArticleRow } from './article-row';

interface DbArticle {
  id: string;
  title: string;
  titleKo: string | null;
  url: string;
  summaryOneLine: string | null;
  summaryThreeLine: string | null;
  publishedAt: string;
  tags: string[] | null;
  imageUrl: string | null;
  language?: string;
  source: { name: string; provider: string } | null;
}

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

/** 배치 조회 API 의 ids 상한 (서버와 동일). 초과 시 청크로 나눠 호출. */
const BATCH_CHUNK = 100;

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
  // 조회 실패해 본문은 못 채웠지만 북마크엔 남아있는 id (해제만 가능하게 노출)
  const [missingIds, setMissingIds] = useState<string[]>([]);

  const fetchBookmarked = useCallback(async () => {
    const ids = [...bookmarks.load()];
    setReadSet(readTracking.load());

    if (ids.length === 0) {
      setArticles([]);
      setMissingIds([]);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    // 상한(BATCH_CHUNK) 단위로 나눠 배치 엔드포인트를 호출한다.
    // 단건 N회 → 청크 1회로 줄여 N+1 호출을 피한다.
    // allSettled 로 일부 청크가 실패해도 성공분은 렌더하고, 전부 실패할 때만 에러.
    const chunks = chunk(ids, BATCH_CHUNK);
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

    const fetched = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    const found = fetched
      .map(mapDbToDto)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    // 조회된 id 집합에 없는 북마크 id 는 "해제만 가능"으로 노출.
    // 실패한 청크의 id 도 found 에 없으므로 자연스럽게 missing 으로 처리된다.
    const foundIds = new Set(fetched.map((d) => d.id));
    const missing = ids.filter((id) => !foundIds.has(id));

    setArticles(found);
    setMissingIds(missing);
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

  const total = articles.length + missingIds.length;

  return (
    <section aria-busy={status === 'loading'}>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <h1
          className="text-[1.625rem] sm:text-[2rem] leading-none tracking-[-0.03em] break-keep"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          저장한 글
        </h1>
        {total > 0 && (
          <p
            className="text-[12.5px] tabular-nums pb-0.5"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            저장{' '}
            <span style={{ color: 'var(--color-accent-strong)', fontWeight: 700 }}>{total}</span>
          </p>
        )}
      </div>

      {status === 'loading' && (
        <p className="py-16 text-[14px]" style={{ color: 'var(--color-fg-muted)' }}>
          저장한 글을 불러오는 중이에요.
        </p>
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

      {status === 'idle' && total === 0 && (
        <div className="py-20 text-center">
          <p
            className="text-[16px] mb-2"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
          >
            아직 저장한 글이 없어요.
          </p>
          <p className="text-[14px] mb-6" style={{ color: 'var(--color-fg-muted)' }}>
            글 목록에서 북마크 아이콘을 눌러 읽을 글을 모아 보세요.
          </p>
          <Link
            href="/?tab=articles"
            className="inline-flex items-center min-h-[44px] px-4 rounded-lg text-[14px] transition-colors hover:bg-(--color-bg-elevated)"
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
        <ul className="flex flex-col">
          {articles.map((a) => (
            <ArticleRow
              key={a.id}
              article={a}
              read={readSet.has(a.id)}
              bookmarked
              onBookmark={handleUnbookmark}
              onToggleRead={handleToggleRead}
            />
          ))}
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
      )}
    </section>
  );
}
