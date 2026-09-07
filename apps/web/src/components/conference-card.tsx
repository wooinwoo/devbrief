'use client';
import { daysUntil } from '@/lib/date-utils';
import { eventType } from '@/lib/event-type';
import type { ConferenceDto } from '@/lib/mock-conferences';
import { BriefIcon } from './brief-icon';
import { CoverImage } from './cover-image';
export function ConferenceCard({ conference: c }: { conference: ConferenceDto }) {
  const d = daysUntil(c.startDate);
  const hackathon = eventType(c) === 'hackathon';
  const date = c.startDate.slice(0, 10);
  const end = c.endDate?.slice(0, 10);
  const source = c.description?.startsWith('일정 출처:') ? c.description : null;
  const topics = c.topics.filter((t) => !/^hackathon$/i.test(t)).slice(0, 2);
  return (
    <li className="event-card">
      <article>
        <a
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="event-cover"
          tabIndex={-1}
        >
          <CoverImage src={c.imageUrl} label={c.name} variant="event" />
          <span className="event-date-tile">
            <span>{date.slice(0, 7).replace('-', '.')}</span>
            <strong>{date.slice(8)}</strong>
          </span>
          <span className="event-kind">{hackathon ? '해커톤' : '컨퍼런스'}</span>
        </a>
        <div className="event-body">
          <div className="event-timing">
            <time
              dateTime={date}
              aria-label={end && end !== date ? `${date}부터 ${end}까지` : date}
            >
              {date.replaceAll('-', '.')}{' '}
              {end && end !== date ? ` — ${end.slice(5).replace('-', '.')}` : ''}
            </time>
            {d <= 0 && <span>{d < 0 ? '진행 중' : '오늘'}</span>}
          </div>
          <a href={c.url} target="_blank" rel="noopener noreferrer">
            <h3>{c.name}</h3>
          </a>
          <p className="event-location">
            <BriefIcon name="globe" size={15} />
            {c.location || '장소 미정'}
          </p>
          <div className="event-tags">
            {topics.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <a href={c.url} target="_blank" rel="noopener noreferrer" className="event-action">
            {hackathon ? '모집·팀 규정 확인' : '프로그램·참가 안내'}
            <BriefIcon name="arrow" size={17} />
          </a>
          {source && (
            <details className="event-source">
              <summary>
                일정 출처 · {source.includes('CC BY-NC') ? 'Agenda · CC BY-NC 4.0' : 'MLH'}
              </summary>
              <p>{source}</p>
            </details>
          )}
        </div>
      </article>
    </li>
  );
}
