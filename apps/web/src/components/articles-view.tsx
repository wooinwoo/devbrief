'use client';

import { isAiArticle } from '@/lib/ai-topics';
import { bookmarks } from '@/lib/bookmark';
import { daysUntil } from '@/lib/date-utils';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { RepoDto } from '@/lib/mock-repos';
import type { VideoDto } from '@/lib/mock-videos';
import { readTracking } from '@/lib/read-tracking';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ArticleDto } from './article-card';
import type { DigestDto } from './daily-digest';
import { LangToggle } from './lang-toggle';
import { PageFooter } from './page-footer';
import { ScrollTop } from './scroll-top';
import { AiTab } from './tabs/ai-tab';
import { ArticlesTab } from './tabs/articles-tab';
import { ConferencesTab } from './tabs/conferences-tab';
import { OverviewTab } from './tabs/overview-tab';
import { ReposTab } from './tabs/repos-tab';
import { VideosTab } from './tabs/videos-tab';

interface Props {
  articles: ArticleDto[];
  videos?: VideoDto[];
  conferences?: ConferenceDto[];
  digest?: DigestDto | null;
  repos?: RepoDto[];
}

type Tab = 'all' | 'ai' | 'articles' | 'conferences' | 'videos' | 'repos' | 'saved';

const TABS: Array<{ id: Tab; label: string; title: string }> = [
  { id: 'all', label: '오늘', title: '오늘의 흐름' },
  { id: 'ai', label: 'AI', title: 'AI 트렌드 레이더' },
  { id: 'articles', label: '개발 뉴스', title: '개발 뉴스' },
  { id: 'conferences', label: '컨퍼런스', title: '개발자 컨퍼런스' },
  { id: 'videos', label: '발표 영상', title: '발표 영상' },
  { id: 'repos', label: '오픈소스', title: '급성장 오픈소스' },
  { id: 'saved', label: '저장', title: '저장한 글' },
];

export function ArticlesView({
  articles,
  videos = [],
  conferences = [],
  digest = null,
  repos = [],
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  // 탭은 URL 쿼리에서 파생 — 새로고침/뒤로가기/링크 공유 시 그대로 복원됨.
  const tabParam = (searchParams.get('tab') as Tab) ?? 'all';
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? tabParam : 'all';
  const setTab = (t: Tab) => router.replace(t === 'all' ? '/' : `/?tab=${t}`, { scroll: true });
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [bookmarkSet, setBookmarkSet] = useState<Set<string>>(new Set());
  const [today, setToday] = useState('');

  useEffect(() => {
    setReadSet(readTracking.load());
    setBookmarkSet(bookmarks.load());
    setToday(
      new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
    );
  }, []);

  const savedArticles = useMemo(
    () => articles.filter((a) => bookmarkSet.has(a.id)),
    [articles, bookmarkSet],
  );
  const unreadCount = useMemo(
    () => articles.filter((a) => !readSet.has(a.id)).length,
    [articles, readSet],
  );
  const upcomingCount = useMemo(
    () => conferences.filter((c) => daysUntil(c.startDate) >= 0).length,
    [conferences],
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
  const aiArticles = useMemo(() => articles.filter(isAiArticle), [articles]);
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
          { label: '전체', value: articles.length },
          { label: '안 본 글', value: unreadCount, accent: true },
        ];
      case 'conferences':
        return [
          { label: '예정', value: upcomingCount, accent: true },
          { label: '전체', value: conferences.length },
        ];
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
      case 'saved':
        return [{ label: '저장한 글', value: savedArticles.length, accent: true }];
      default:
        return [
          { label: '전체', value: articles.length },
          { label: '안 본 글', value: unreadCount, accent: true },
          { label: '컨퍼런스', value: upcomingCount },
          { label: '영상', value: videos.length },
        ];
    }
  }, [
    tab,
    aiCount,
    aiUnread,
    articles.length,
    unreadCount,
    upcomingCount,
    conferences.length,
    videos.length,
    repos,
    savedArticles.length,
  ]);

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* === 상단 가로 헤더 바 (sticky) ===================== */}
      <header
        className="sticky top-0 z-30 mx-[calc(50%-50vw)] border-b backdrop-blur-md"
        style={{
          borderColor: 'var(--bar-line)',
          background: 'oklch(25% 0.035 265 / 0.92)',
        }}
      >
        <div className="px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 flex items-center gap-4 sm:gap-8 h-[68px]">
          {/* 로고 */}
          <Link
            href="/"
            aria-label="Devbrief 홈"
            className="shrink-0 text-[21px] tracking-[-0.02em]"
            style={{ color: 'var(--bar-fg)', fontWeight: 800 }}
          >
            Dev<span style={{ color: 'var(--bar-accent)' }}>brief</span>
          </Link>

          {/* 탭 nav */}
          <nav className="no-scrollbar flex items-center gap-0.5 sm:gap-1 flex-1 min-w-0 overflow-x-auto">
            {TABS.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className="shrink-0 px-3 sm:px-3.5 py-2 rounded-lg text-[14px] sm:text-[14.5px] tracking-[-0.005em] transition-colors relative"
                  style={{
                    color: isActive ? 'var(--bar-fg)' : 'var(--bar-fg-muted)',
                    background: isActive ? 'oklch(100% 0 0 / 0.1)' : 'transparent',
                    fontWeight: isActive ? 700 : 500,
                    boxShadow: isActive ? 'inset 0 -2px 0 0 var(--bar-accent)' : undefined,
                  }}
                >
                  {t.label}
                  {t.id === 'saved' && savedArticles.length > 0 && (
                    <span
                      className="ml-1 tabular-nums text-[11px] px-1.5 py-px rounded-full align-middle"
                      style={{
                        background: isActive ? 'var(--bar-accent)' : 'oklch(100% 0 0 / 0.12)',
                        color: isActive ? 'oklch(20% 0.03 265)' : 'var(--bar-fg-muted)',
                        fontWeight: 700,
                      }}
                    >
                      {savedArticles.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 우측 날짜 + 언어 토글 */}
          <div className="shrink-0 flex items-center gap-3">
            {today && (
              <span
                className="hidden xl:block text-[12px] tabular-nums"
                style={{ color: 'var(--bar-fg-muted)' }}
              >
                {today}
              </span>
            )}
            <LangToggle />
          </div>
        </div>
      </header>

      {/* === 콘텐츠 (전체 흰 배경 위 직접, 박스 없이 선·여백으로 구분) === */}
      <div className="mt-8 flex-1">
        {/* (이전 흰 패널 박스 제거 — 배경이 이미 흰색이라 불필요) */}
        {/* === 페이지 제목 줄 ============================== */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <h1
            className="text-[1.625rem] sm:text-[2rem] leading-none tracking-[-0.03em] break-keep"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            {activeTab?.title ?? '오늘의 흐름'}
          </h1>
          <p
            className="text-[12.5px] tabular-nums pb-0.5"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            {statSegments.map((s, i) => (
              <span key={s.label}>
                {i > 0 && <span style={{ color: 'var(--color-fg-subtle)' }}> · </span>}
                {s.label}{' '}
                <span
                  style={
                    s.accent ? { color: 'var(--color-accent-strong)', fontWeight: 700 } : undefined
                  }
                >
                  {s.value}
                </span>
              </span>
            ))}
          </p>
        </div>

        {/* === 탭별 레이아웃 (각자 다름) ====================== */}
        {tab === 'all' && (
          <OverviewTab
            articles={articles}
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
            articles={articles}
            readSet={readSet}
            bookmarkSet={bookmarkSet}
            onOpen={handleOpen}
            onBookmark={handleBookmark}
          />
        )}
        {tab === 'articles' && (
          <ArticlesTab
            articles={articles}
            readSet={readSet}
            bookmarkSet={bookmarkSet}
            onOpen={handleOpen}
            onBookmark={handleBookmark}
            conferences={conferences}
            videos={videos}
            onNavigate={setTab}
          />
        )}
        {tab === 'conferences' && <ConferencesTab conferences={conferences} />}
        {tab === 'videos' && <VideosTab videos={videos} />}
        {tab === 'repos' && <ReposTab repos={repos} />}
        {tab === 'saved' && (
          <ArticlesTab
            articles={savedArticles}
            readSet={readSet}
            bookmarkSet={bookmarkSet}
            onOpen={handleOpen}
            onBookmark={handleBookmark}
            emptyLabel="아직 저장한 글이 없어요. 각 글 오른쪽의 북마크 아이콘을 눌러 모아 보세요."
          />
        )}
      </div>

      <PageFooter total={articles.length} />
      <ScrollTop />
    </div>
  );
}
