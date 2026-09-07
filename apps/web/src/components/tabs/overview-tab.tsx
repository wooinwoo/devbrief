'use client';

import { isUpcomingEvent } from '@/lib/date-utils';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { VideoDto } from '@/lib/mock-videos';
import type { ArticleDto } from '../article-card';
import { ConferenceCard } from '../conference-card';
import { DailyDigest, type DigestDto } from '../daily-digest';
import { ReadingBrief } from '../reading-brief';
import { VideoCard } from '../video-card';

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
 * 관심 분야의 읽을 글을 먼저 보여주고, 종합 다이제스트·컨퍼런스·영상을 이어서 제공한다.
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
  const upcoming = conferences
    .filter(isUpcomingEvent)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  const recentVideos = videos.slice(0, 3);

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <ReadingBrief
        articles={articles}
        readSet={readSet}
        bookmarkSet={bookmarkSet}
        onOpen={onOpen}
        onBookmark={onBookmark}
        onBrowse={() => onMore('articles')}
      />
      <DailyDigest digest={digest} />

      {/* 3. 곧 열리는 행사 */}
      {upcoming.length > 0 && (
        <section>
          <SectionHeaderWithMore
            label="곧 열리는 행사"
            count={upcoming.length}
            onMore={() => onMore('conferences')}
          />
          <ul>
            {upcoming.map((c) => (
              <ConferenceCard key={c.id} conference={c} />
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
            {recentVideos.map((v) => (
              <VideoCard key={v.id} video={v} />
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
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-(--color-line-strong)">
      <h2
        className="text-xl leading-snug tracking-[-0.02em]"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 650 }}
      >
        {label}
      </h2>
      <span
        className="text-xs tabular-nums"
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
        aria-label={`${label} 더 보기`}
        className="min-h-11 px-1 text-[13px] transition-colors hover:text-(--color-accent-strong)"
        style={{ color: 'var(--color-accent)', fontWeight: 600 }}
      >
        더 보기 →
      </button>
    </div>
  );
}
