'use client';

import Link from 'next/link';
import { ArticleRow } from '../article-row';
import { FeaturedArticle } from '../featured-article';
import { SectionHeader } from '../section-header';
import { DailyDigest, type DigestDto } from '../daily-digest';
import { ConferenceCard } from '../conference-card';
import { VideoCard } from '../video-card';
import type { ArticleDto } from '../article-card';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { VideoDto } from '@/lib/mock-videos';

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
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
  const [featured, ...rest] = articles;
  const topArticles = rest.slice(0, 6);

  const upcoming = conferences
    .filter((c) => daysUntil(c.startDate) >= 0)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )
    .slice(0, 3);

  const recentVideos = videos.slice(0, 3);

  return (
    <div className="flex flex-col gap-10">
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
        <ul>
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
    <div
      className="flex items-baseline gap-3 mb-4 pt-1 border-t-2"
      style={{ borderColor: 'var(--color-fg-strong)' }}
    >
      <span
        className="text-[15px] tracking-[-0.01em]"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
      >
        {label}
      </span>
      <span
        className="text-[11.5px] tabular-nums"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        {count}
      </span>
      <span className="flex-1" />
      <button
        type="button"
        onClick={onMore}
        className="text-[12px] transition-colors"
        style={{ color: 'var(--color-accent)', fontWeight: 600 }}
      >
        더 보기 →
      </button>
    </div>
  );
}
