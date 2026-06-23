'use client';

import { daysUntil } from '@/lib/date-utils';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { VideoDto } from '@/lib/mock-videos';
import Link from 'next/link';
import type { ArticleDto } from '../article-card';
import { ArticleRow } from '../article-row';
import { ConferenceCard } from '../conference-card';
import { DailyDigest, type DigestDto } from '../daily-digest';
import { FeaturedArticle } from '../featured-article';
import { SectionHeader } from '../section-header';
import { VideoCard } from '../video-card';

// 큐레이션 점수: 한국어화 > 양질 소스 > 가공완료 > 이미지 > 최신성.
const KO_SOURCES = new Set(['geeknews', 'kakao_tech', 'toss_tech', 'woowahan', 'naver_d2']);
function curationScore(a: ArticleDto): number {
  let s = 0;
  const isKo = !!a.titleKo || a.language === 'ko' || /[가-힣]/.test(a.title);
  if (isKo) s += 100; // 홈은 한국어 우선 쇼케이스
  if (KO_SOURCES.has(a.source.provider)) s += 30;
  if (a.summaryOneLine) s += 15; // 요약 가공 완료
  if (a.imageUrl) s += 10;
  const ageDays = (Date.now() - new Date(a.publishedAt).getTime()) / 86_400_000;
  s += Math.max(0, 14 - ageDays); // 2주 내 최신성 가산
  return s;
}

interface Props {
  articles: ArticleDto[];
  conferences: ConferenceDto[];
  videos: VideoDto[];
  digest: DigestDto | null;
  readSet: Set<string>;
  bookmarkSet?: Set<string>;
  onOpen: (id: string) => void;
  onBookmark?: (id: string) => void;
  onMore: (tab: 'articles' | 'conferences' | 'videos') => void;
}

/**
 * 전체 탭 = 오늘의 종합 미리보기.
 * Digest → 주요 글 → 곧 열리는 컨퍼런스 3개 → 최신 영상 3개.
 * 각 섹션 "더 보기" 로 해당 탭 이동.
 */
export function OverviewTab({
  articles,
  conferences,
  videos,
  digest,
  readSet,
  bookmarkSet,
  onOpen,
  onBookmark,
  onMore,
}: Props) {
  // 홈 = 큐레이션 쇼케이스. 최신순(API) 그대로면 갓 수집된 영문 dev.to 글이 상위를
  // 독식한다 → 한국어화·양질 소스·가공완료 글을 위로 올려 첫인상을 한국어 중심으로.
  const ranked = [...articles].sort((a, b) => curationScore(b) - curationScore(a));
  const [featured, ...rest] = ranked;
  // 소스 쏠림 방지 — 한 소스(예: GeekNews)가 주요 글을 독식하지 않게 소스당 최대 2개.
  const perSource = new Map<string, number>();
  const topArticles: ArticleDto[] = [];
  for (const a of rest) {
    const n = perSource.get(a.source.provider) ?? 0;
    if (n >= 2) continue;
    perSource.set(a.source.provider, n + 1);
    topArticles.push(a);
    if (topArticles.length >= 6) break;
  }

  const upcoming = conferences
    .filter((c) => daysUntil(c.startDate) >= 0)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  const recentVideos = videos.slice(0, 3);

  return (
    <div className="flex flex-col gap-16">
      {/* 1. 오늘의 핵심 다이제스트 */}
      <DailyDigest digest={digest} />

      {/* 2. 주요 글 */}
      <section>
        <SectionHeaderWithMore
          label="주요 글"
          count={articles.length}
          onMore={() => onMore('articles')}
        />
        {featured && (
          <FeaturedArticle
            article={featured}
            read={readSet.has(featured.id)}
            onOpen={() => onOpen(featured.id)}
          />
        )}
        <ul className="grid xl:grid-cols-2 gap-x-10">
          {topArticles.map((a, i) => (
            <ArticleRow
              key={a.id}
              article={a}
              read={readSet.has(a.id)}
              bookmarked={bookmarkSet?.has(a.id)}
              onOpen={() => onOpen(a.id)}
              onBookmark={onBookmark}
              index={i}
            />
          ))}
        </ul>
      </section>

      {/* 3. 곧 열리는 컨퍼런스 */}
      {upcoming.length > 0 && (
        <section>
          <SectionHeaderWithMore
            label="곧 열리는 컨퍼런스"
            count={upcoming.length}
            onMore={() => onMore('conferences')}
          />
          <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((c, i) => (
              <ConferenceCard key={c.id} conference={c} index={i} />
            ))}
          </ul>
        </section>
      )}

      {/* 4. 발표 영상 */}
      {recentVideos.length > 0 && (
        <section>
          <SectionHeaderWithMore
            label="발표 영상"
            count={videos.length}
            onMore={() => onMore('videos')}
          />
          <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {recentVideos.map((v, i) => (
              <VideoCard key={v.id} video={v} index={i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SectionHeaderWithMore({
  label,
  count,
  onMore,
}: {
  label: string;
  count: number;
  onMore: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        aria-hidden
        className="inline-block w-1 h-5 rounded-full"
        style={{ background: 'var(--color-accent)' }}
      />
      <h2
        className="text-[1.25rem] leading-none tracking-[-0.02em]"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 800 }}
      >
        {label}
      </h2>
      <span
        className="text-[12px] tabular-nums px-2 py-0.5 rounded-full"
        style={{
          color: 'var(--color-fg-muted)',
          background: 'var(--color-bg-sunken)',
          fontWeight: 600,
        }}
      >
        {count}
      </span>
      <span className="flex-1" />
      <button
        type="button"
        onClick={onMore}
        className="text-[12.5px] transition-colors hover:text-(--color-accent-strong)"
        style={{ color: 'var(--color-accent)', fontWeight: 600 }}
      >
        더 보기 →
      </button>
    </div>
  );
}
