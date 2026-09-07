'use client';
import { CATEGORIES } from '@/lib/category';
import { isUpcomingEvent } from '@/lib/date-utils';
import { pickTitle, useLang } from '@/lib/lang-context';
import type { ConferenceDto } from '@/lib/mock-conferences';
import type { VideoDto } from '@/lib/mock-videos';
import Link from 'next/link';
import type { ArticleDto } from '../article-card';
import { BriefIcon } from '../brief-icon';
import { BriefStory } from '../brief-story';
import { ConferenceCard } from '../conference-card';
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
  const { lang } = useLang();
  // Generated social cards repeat the headline; prefer a real editorial cover.
  const illustrated = articles.filter(
    (article) => article.imageUrl && !article.imageUrl.includes('social.news.hada.io/'),
  );
  const feature =
    illustrated.find((article) => article.language === 'ko') ?? illustrated[0] ?? articles[0];
  const remaining = articles.filter((a) => a.id !== feature?.id);
  const sources = new Set<string>();
  const varied = remaining.filter((a) => {
    if (sources.has(a.source.name)) return false;
    sources.add(a.source.name);
    return true;
  });
  const latest = [...varied, ...remaining.filter((a) => !varied.includes(a))].slice(0, 3);
  const shown = new Set([feature?.id, ...latest.map((a) => a.id)]);
  const discoveries = remaining.filter((a) => !shown.has(a.id)).slice(0, 2);
  const upcoming = conferences
    .filter(isUpcomingEvent)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3);
  return (
    <div className="overview">
      <div className="overview-top">
        {feature ? (
          <BriefStory
            article={feature}
            featured
            saved={bookmarkSet?.has(feature.id)}
            read={readSet.has(feature.id)}
            onOpen={() => onOpen(feature.id)}
            onBookmark={onBookmark}
          />
        ) : (
          <div className="empty-panel">새로운 글을 준비하고 있어요.</div>
        )}
        <aside className="daily-rail">
          <h2>새로 도착한 소식</h2>
          <ol>
            {latest.map((a, i) => (
              <li key={a.id}>
                <span className="rail-number">{String(i + 1).padStart(2, '0')}</span>
                <Link href={`/articles/${a.id}`} onClick={() => onOpen(a.id)}>
                  <span>{a.source.name}</span>
                  <h3>{pickTitle(a, lang).primary}</h3>
                </Link>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => onMore('articles')} className="text-link">
            개발 뉴스 모두 보기
            <BriefIcon name="arrow" size={17} />
          </button>
        </aside>
      </div>
      <nav className="topic-strip" aria-label="관심 기술 빠른 탐색">
        <span>어떤 기술을 찾으세요?</span>
        {Object.values(CATEGORIES)
          .filter((c) => c.key !== 'etc')
          .map((c) => (
            <Link key={c.key} href={`/?tab=articles&cat=${c.key}`}>
              {c.label}
              <BriefIcon name="arrow" size={14} />
            </Link>
          ))}
      </nav>
      {discoveries.length > 0 && (
        <section>
          <HomeSection
            title="함께 읽을 개발 이야기"
            action="모든 글 보기"
            onMore={() => onMore('articles')}
          />
          <div className="story-grid">
            {discoveries.map((a) => (
              <BriefStory
                key={a.id}
                article={a}
                saved={bookmarkSet?.has(a.id)}
                read={readSet.has(a.id)}
                onOpen={() => onOpen(a.id)}
                onBookmark={onBookmark}
              />
            ))}
          </div>
        </section>
      )}
      <div className="watch-section">
        <HomeSection
          title="개발자 발표 영상"
          action="발표 영상 모두 보기"
          onMore={() => onMore('videos')}
        />
        <ul className="video-grid">
          {videos.slice(0, 2).map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </ul>
      </div>
      {upcoming.length > 0 && (
        <section>
          <HomeSection
            title="다가오는 행사"
            action="행사 일정 모두 보기"
            onMore={() => onMore('conferences')}
          />
          <ul className="event-grid">
            {upcoming.map((c) => (
              <ConferenceCard key={c.id} conference={c} />
            ))}
          </ul>
        </section>
      )}
      <div className="personal-brief">
        <HomeSection title="관심 분야의 글" action="개발 뉴스" onMore={() => onMore('articles')} />
        <ReadingBrief
          articles={articles}
          readSet={readSet}
          bookmarkSet={bookmarkSet}
          onOpen={onOpen}
          onBookmark={onBookmark}
          onBrowse={() => onMore('articles')}
        />
      </div>
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
      <button type="button" onClick={onMore} className="text-link">
        {action}
        <BriefIcon name="arrow" size={17} />
      </button>
    </div>
  );
}
