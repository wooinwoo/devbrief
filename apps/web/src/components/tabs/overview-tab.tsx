'use client';
import { isUpcomingEvent } from '@/lib/date-utils';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { VideoDto } from '@/lib/mock-videos';
import type { ArticleDto } from '../article-card';
import { BriefIcon } from '../brief-icon';
import type { DigestDto } from '../daily-digest';
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
export function OverviewTab({
  articles,
  conferences,
  videos,
  readSet,
  bookmarkSet,
  onOpen,
  onBookmark,
  onMore,
}: Props) {
  const upcoming = conferences
    .filter(isUpcomingEvent)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3);
  const sourcedEvents = upcoming.filter((c) => c.description?.startsWith('일정 출처:'));
  return (
    <div className="overview">
      <div className="home-main">
        <ReadingBrief
          articles={articles}
          readSet={readSet}
          bookmarkSet={bookmarkSet}
          onOpen={onOpen}
          onBookmark={onBookmark}
          onBrowse={() => onMore('articles')}
        />
      </div>
      <aside className="home-side" aria-label="영상과 행사">
        {upcoming.length > 0 && (
          <section>
            <HomeSection
              title="다가오는 행사"
              action="행사 일정 모두 보기"
              onMore={() => onMore('conferences')}
            />
            <ul className="home-side-events">
              {upcoming.map((c) => {
                const date = c.startDate.slice(0, 10);
                const end = c.endDate?.slice(0, 10);
                return (
                  <li key={c.id}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="home-side-event"
                    >
                      <time
                        dateTime={date}
                        aria-label={end && end !== date ? `${date}부터 ${end}까지` : date}
                      >
                        {date.replaceAll('-', '.')}
                        {end && end !== date ? ` — ${end.slice(5).replace('-', '.')}` : ''}
                      </time>
                      <h3>{c.name}</h3>
                      <span>{c.location || '장소 미정'}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
            {sourcedEvents.length > 0 && (
              <details className="home-side-event-source">
                <summary>일정 출처</summary>
                {sourcedEvents.map((c) => (
                  <p key={c.id}>
                    <strong>{c.name}</strong>
                    <br />
                    {c.description}
                  </p>
                ))}
              </details>
            )}
          </section>
        )}
        <section>
          <HomeSection
            title="개발자 발표 영상"
            action="발표 영상 모두 보기"
            onMore={() => onMore('videos')}
          />
          <ul className="home-side-videos">
            {videos.slice(0, 2).map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
function HomeSection({
  title,
  action,
  onMore,
}: { title: string; action: string; onMore: () => void }) {
  return (
    <div className="home-section-title">
      <div>
        <h2>{title}</h2>
      </div>
      <button type="button" onClick={onMore} className="text-link" aria-label={action}>
        모두 보기
        <BriefIcon name="arrow" size={17} />
      </button>
    </div>
  );
}
