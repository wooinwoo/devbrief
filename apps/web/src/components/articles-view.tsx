'use client';

import { isAiArticle } from '@/lib/ai-topics';
import { API_BASE } from '@/lib/api';
import { parseArticleRows } from '@/lib/article-response';
import { bookmarks } from '@/lib/bookmark';
import { fetchConferenceCatalog } from '@/lib/conference-catalog';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { RepoDto } from '@/lib/mock-repos';
import type { VideoDto } from '@/lib/mock-videos';
import { publicRead } from '@/lib/public-read';
import { readTracking } from '@/lib/read-tracking';
import { useUrlFilters } from '@/lib/use-url-filter';
import { useVisibleNavigation } from '@/lib/use-visible-navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ArticleDto } from './article-card';
import { BriefIcon } from './brief-icon';
import type { DigestDto } from './daily-digest';
import { GlobalSearch } from './global-search';
import { LangToggle } from './lang-toggle';
import { LoadFailure } from './load-failure';
import { PageFooter } from './page-footer';
import { ScrollTop } from './scroll-top';
import { AiTab } from './tabs/ai-tab';
import { ArticlesTab } from './tabs/articles-tab';
import { ConferencesTab } from './tabs/conferences-tab';
import { OverviewTab } from './tabs/overview-tab';
import { ReposTab } from './tabs/repos-tab';
import { VideosTab } from './tabs/videos-tab';

interface Props {
  initialLoadErrors?: string[];
  loadConferenceCatalog?: boolean;
  articles: ArticleDto[];
  /** GET /articles 의 X-Total-Count — 서버 전체 글 수. null/미지정이면 전체 미상 (감사 c62). */
  total?: number | null;
  videos?: VideoDto[];
  conferences?: ConferenceDto[];
  digest?: DigestDto | null;
  repos?: RepoDto[];
}

type Tab = 'all' | 'ai' | 'articles' | 'conferences' | 'videos' | 'repos';

const TABS: Array<{ id: Tab; label: string; title: string }> = [
  { id: 'all', label: '오늘', title: '오늘의 개발 브리핑' },
  { id: 'ai', label: 'AI', title: 'AI 트렌드 레이더' },
  { id: 'articles', label: '개발 뉴스', title: '개발 뉴스' },
  { id: 'conferences', label: '행사', title: '개발 행사' },
  { id: 'videos', label: '발표 영상', title: '개발자 발표 영상' },
  { id: 'repos', label: '오픈소스', title: '급성장 오픈소스' },
];

// '더 불러오기' 1회 페치 분량 — 첫 로드(page.tsx limit=100)와 동일, 서버 캡(최대 100) 이내.
const LOAD_MORE_LIMIT = 100;

export function ArticlesView({
  articles,
  initialLoadErrors = [],
  loadConferenceCatalog = false,
  total = null,
  videos = [],
  conferences = [],
  digest = null,
  repos = [],
}: Props) {
  const { searchParams, setParam } = useUrlFilters();
  // 탭은 URL 쿼리에서 파생 — 새로고침/뒤로가기/링크 공유 시 그대로 복원됨.
  const tabParam = (searchParams.get('tab') as Tab) ?? 'all';
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? tabParam : 'all';
  useVisibleNavigation(tab);
  // 탭 전환 시에도 tab 키만 갱신하고 나머지 쿼리(q/source/cat/unread 등)는 보존한다 —
  // 각 탭의 setParam 이 tab 키를 보존하는 것과 같은 계약. 화살표 키 탐색·재클릭에
  // 필터가 통째로 날아가던 문제 방지.
  const setTab = useCallback(
    (t: Tab) => {
      setParam('tab', t === 'all' ? null : t);
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParam],
  );
  const [conferenceCatalog, setConferenceCatalog] = useState(conferences);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(loadConferenceCatalog);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogRetry, setCatalogRetry] = useState(0);
  useEffect(() => {
    if (!loadConferenceCatalog || tab !== 'conferences' || catalogLoaded) return;
    const controller = new AbortController();
    setCatalogLoading(true);
    setCatalogError(false);
    fetchConferenceCatalog(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setConferenceCatalog(rows);
          setCatalogLoaded(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, [tab, loadConferenceCatalog, catalogLoaded, catalogRetry]);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [bookmarkSet, setBookmarkSet] = useState<Set<string>>(new Set());
  const [today, setToday] = useState('');

  // c62 — '더 불러오기': 서버 첫 로드(최신 100건) 뒤 offset 페치로 이전 글을 이어 붙인다.
  // NEXT_PUBLIC_API_BASE 직접 호출(서버가 CORS exposedHeaders 처리 완료).
  const [moreArticles, setMoreArticles] = useState<ArticleDto[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // 서버 응답이 비면 total 과의 드리프트(삭제 등)로 판단하고 버튼을 접는다.
  const [drained, setDrained] = useState(false);

  const allArticles = useMemo(() => {
    if (moreArticles.length === 0) return articles;
    // 첫 로드 이후 새 글이 목록 앞에 끼면 offset 페치가 겹칠 수 있어 id 기준 중복 제거.
    const seen = new Set<string>();
    const merged: ArticleDto[] = [];
    for (const a of [...articles, ...moreArticles]) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      merged.push(a);
    }
    return merged;
  }, [articles, moreArticles]);

  const hasMore = total !== null && allArticles.length < total && !drained;

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const res = await publicRead(
        `${API_BASE}/articles?limit=${LOAD_MORE_LIMIT}&offset=${allArticles.length}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error('Articles unavailable');
      const data = parseArticleRows(await res.json());
      if (data.length === 0) {
        setDrained(true);
        return;
      }
      setMoreArticles((prev) => [...prev, ...data]);
    } catch {
      setLoadMoreError(
        '이전 글을 불러오지 못했어요. 현재 목록은 그대로이며 다시 시도할 수 있어요.',
      );
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, allArticles.length]);

  useEffect(() => {
    setReadSet(readTracking.load());
    setBookmarkSet(bookmarks.load());
    setToday(
      new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        timeZone: 'Asia/Seoul', // 방문자 로컬 TZ 아닌 서비스 기준(KST) 날짜
      }),
    );
  }, []);

  const unreadCount = useMemo(
    () => allArticles.filter((a) => !readSet.has(a.id)).length,
    [allArticles, readSet],
  );

  const handleOpen = (id: string) => {
    readTracking.add(id);
    setReadSet((prev) => new Set([...prev, id]));
  };

  const handleBookmark = (id: string) => {
    setBookmarkSet(bookmarks.toggle(id));
  };

  const activeTab = TABS.find((t) => t.id === tab);

  // 제목줄 우측 통계 — 활성 탭과 무관한 숫자를 늘어놓지 않고 탭별로 맞춘다.
  const aiArticles = useMemo(() => allArticles.filter(isAiArticle), [allArticles]);
  const aiCount = aiArticles.length;
  const aiUnread = useMemo(
    () => aiArticles.filter((a) => !readSet.has(a.id)).length,
    [aiArticles, readSet],
  );
  const statSegments = useMemo((): Array<{
    label: string;
    value: number;
    accent?: boolean;
  }> => {
    switch (tab) {
      case 'ai':
        return [
          { label: 'AI 소식', value: aiCount },
          { label: '안 본 글', value: aiUnread, accent: true },
        ];
      case 'articles':
        return [
          // '전체'는 로드된 개수가 아닌 서버 전체 건수(X-Total-Count) — 미상이면 로드 수로 폴백.
          { label: '전체', value: total ?? allArticles.length },
          { label: '안 본 글', value: unreadCount, accent: true },
        ];
      case 'conferences':
        return [];
      case 'videos':
        return [{ label: '영상', value: videos.length }];
      case 'repos':
        return [
          {
            label: '주간 급상승',
            value: repos.filter((r) => r.period === 'weekly').length,
            accent: true,
          },
          {
            label: '일간',
            value: repos.filter((r) => r.period === 'daily').length,
          },
        ];
      default:
        return [
          { label: '불러온 글', value: allArticles.length },
          { label: '안 읽은 글', value: unreadCount, accent: true },
        ];
    }
  }, [tab, aiCount, aiUnread, allArticles.length, total, unreadCount, videos.length, repos]);

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* === 상단 가로 헤더 바 (sticky) ===================== */}
      <header
        className="brief-header sticky top-0 z-30 mx-[calc(50%-50vw)] border-b [&_:focus-visible]:outline-(--bar-accent)"
        style={{
          borderColor: 'var(--bar-line)',
          background: 'var(--bar-bg)',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 grid grid-cols-[1fr_auto] lg:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-6 lg:gap-x-8">
          {/* 로고 */}
          <Link
            href="/"
            aria-label="Devbrief 홈"
            className="wordmark min-h-[60px] lg:min-h-[72px] shrink-0"
            style={{ color: 'var(--bar-fg)', fontWeight: 800 }}
          >
            devbrief<span>.</span>
          </Link>

          {/* 탭 nav — WAI-ARIA tabs 패턴. 좌우 화살표로 탭 간 이동(roving tabindex). */}
          <nav
            aria-label="콘텐츠 탐색"
            className="header-navigation order-3 col-span-2 lg:order-none lg:col-span-1 flex items-center gap-1 min-w-0 pb-2 lg:py-0"
          >
            <div
              role="tablist"
              aria-label="콘텐츠 탭"
              className="header-tabs no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1 overflow-x-auto"
            >
              {TABS.map((t, i) => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-controls="content-panel"
                    aria-selected={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    // roving tabindex — 활성 탭만 Tab 으로 진입, 나머지는 화살표로 이동.
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setTab(t.id)}
                    onKeyDown={(e) => {
                      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                      e.preventDefault();
                      const dir = e.key === 'ArrowRight' ? 1 : -1;
                      const next = TABS[(i + dir + TABS.length) % TABS.length];
                      setTab(next.id);
                      // 이동한 탭으로 포커스도 옮겨 키보드 흐름 유지.
                      requestAnimationFrame(() =>
                        document.getElementById(`tab-${next.id}`)?.focus(),
                      );
                    }}
                    className="shrink-0 px-3 sm:px-3.5 min-h-11 py-2 rounded-sm text-[14px] sm:text-[14.5px] tracking-[-0.005em] transition-colors relative"
                    style={{
                      color: isActive ? 'var(--bar-fg)' : 'var(--bar-fg-muted)',
                      background: 'transparent',
                      fontWeight: isActive ? 700 : 500,
                      boxShadow: isActive ? 'inset 0 -2px 0 0 var(--bar-accent)' : undefined,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            {/* 저장: 메인 목록에 의존하지 않는 전용 페이지(/bookmarks)로 분리 */}
            <Link
              href="/bookmarks"
              aria-label="저장"
              className="header-saved-link shrink-0 inline-flex items-center justify-center gap-1 w-[60px] lg:w-auto lg:px-3.5 min-h-11 py-2 rounded-sm text-[14px] sm:text-[14.5px] tracking-[-0.005em] transition-colors relative hover:bg-[oklch(100%_0_0/0.1)]"
              style={{ color: 'var(--bar-fg-muted)', fontWeight: 500 }}
              aria-describedby={bookmarkSet.size > 0 ? 'header-saved-count' : undefined}
            >
              <span className="inline-flex lg:hidden" aria-hidden="true">
                <BriefIcon name="bookmark" size={16} />
              </span>
              저장
              {/* 배지는 로드된 목록(최신 100건)과의 교집합이 아닌 북마크 저장소 전체 크기 —
                  /bookmarks 총계와 항상 일치한다(둘 다 localStorage 기준). */}
              {bookmarkSet.size > 0 && (
                <>
                  <span id="header-saved-count" className="sr-only">
                    저장한 글 {bookmarkSet.size}개
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden lg:inline ml-1 tabular-nums text-[11px] px-1.5 py-px rounded-full align-middle"
                    style={{
                      background: 'oklch(100% 0 0 / 0.12)',
                      color: 'var(--bar-fg-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {bookmarkSet.size}
                  </span>
                </>
              )}
            </Link>
          </nav>

          {/* 우측 날짜 + 언어 토글 */}
          <div className="shrink-0 flex items-center justify-end gap-3">
            {today && (
              <span
                className="hidden text-[12px] tabular-nums"
                style={{ color: 'var(--bar-fg-muted)' }}
              >
                {today}
              </span>
            )}
            <GlobalSearch />
            <LangToggle />
          </div>
        </div>
      </header>

      {initialLoadErrors.length > 0 && <LoadFailure feeds={initialLoadErrors} />}

      {/* Content layouts are tailored to each reading or discovery task. */}
      <div
        className="mt-8 sm:mt-12 flex-1"
        role="tabpanel"
        id="content-panel"
        aria-labelledby={`tab-${tab}`}
      >
        <div
          className={`brief-heading${tab === 'all' ? ' edition-heading' : ''}${tab === 'repos' ? ' directory-heading' : ''}`}
        >
          <div>
            <h1>{activeTab?.title}</h1>
            <p>
              {
                {
                  all: '개발 뉴스와 발표 영상, 다가오는 행사를 한곳에서.',
                  ai: '모델과 도구, 그리고 개발의 다음 가능성.',
                  articles: '개발자의 시야를 넓히는 새로운 이야기.',
                  conferences: '국내외 컨퍼런스, 해커톤, 밋업 일정을 찾아보세요.',
                  videos: '현업 개발자의 고민과 해결 과정을 만나보세요.',
                  repos: '전 세계 개발자들이 주목하는 오픈소스 프로젝트.',
                }[tab]
              }
            </p>
          </div>
          <div className="heading-stats">
            {tab === 'all' ? (
              <span>{today || 'DAILY EDITION'}</span>
            ) : (
              statSegments.map((s) => (
                <span key={s.label}>
                  {s.label} <strong>{s.value}</strong>
                </span>
              ))
            )}
          </div>
        </div>

        {/* === 탭별 레이아웃 (각자 다름) ====================== */}
        {tab === 'all' && (
          <OverviewTab
            articles={allArticles}
            conferences={conferences}
            videos={videos}
            digest={digest}
            readSet={readSet}
            bookmarkSet={bookmarkSet}
            onOpen={handleOpen}
            onBookmark={handleBookmark}
            onMore={setTab}
          />
        )}
        {tab === 'ai' && (
          <AiTab
            articles={allArticles}
            readSet={readSet}
            bookmarkSet={bookmarkSet}
            onOpen={handleOpen}
            onBookmark={handleBookmark}
          />
        )}
        {tab === 'articles' && (
          <ArticlesTab
            articles={allArticles}
            readSet={readSet}
            bookmarkSet={bookmarkSet}
            onOpen={handleOpen}
            onBookmark={handleBookmark}
            conferences={conferences}
            videos={videos}
            onNavigate={setTab}
            loadMore={
              hasMore && total !== null
                ? { total, loading: loadingMore, error: loadMoreError, onLoadMore: handleLoadMore }
                : undefined
            }
          />
        )}
        {tab === 'conferences' && (
          <>
            {catalogError && (
              <div className="catalog-error" role="alert">
                전체 일정을 불러오지 못했어요.
                {conferenceCatalog.length > 0 &&
                  ` 먼저 받은 ${conferenceCatalog.length}개 일정을 표시합니다.`}
                <button type="button" onClick={() => setCatalogRetry((n) => n + 1)}>
                  다시 시도
                </button>
              </div>
            )}
            {catalogLoading ? (
              <div className="catalog-loading" role="status">
                <p>전체 일정을 불러오는 중이에요…</p>
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
              </div>
            ) : (
              <ConferencesTab conferences={conferenceCatalog} />
            )}
          </>
        )}
        {tab === 'videos' && <VideosTab videos={videos} />}
        {tab === 'repos' && <ReposTab repos={repos} />}
      </div>

      <PageFooter total={allArticles.length} />
      <ScrollTop />
    </div>
  );
}
