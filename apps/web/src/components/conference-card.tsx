'use client';
import { daysUntil } from '@/lib/date-utils';
import { EVENT_TYPE_LABELS, eventType } from '@/lib/event-type';
import type { ConferenceDto } from '@/lib/mock-conferences';
import { BriefIcon } from './brief-icon';
import { CoverImage } from './cover-image';
export function ConferenceCard({ conference: c }: { conference: ConferenceDto }) {
  const d = daysUntil(c.startDate);
  const type = eventType(c);
  const date = c.startDate.slice(0, 10);
  const end = c.endDate?.slice(0, 10);
  const source = c.description?.startsWith('일정 출처:') ? c.description : null;
  const topics = c.topics.filter((t) => !/^(hackathon|meetup)$/i.test(t.trim())).slice(0, 2);
  return (
    <li className="event-card">
      <article>
        <div className="event-card-header">
          <div className="event-card-meta">
            <time
              dateTime={date}
              aria-label={end && end !== date ? `${date}부터 ${end}까지` : date}
            >
              {date.replaceAll('-', '.')}{' '}
              {end && end !== date ? ` — ${end.slice(5).replace('-', '.')}` : ''}
            </time>
            <span className="event-kind">{EVENT_TYPE_LABELS[type]}</span>
          </div>
          {c.imageUrl && (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="event-cover"
              tabIndex={-1}
              aria-label={c.name}
            >
              <CoverImage src={c.imageUrl} label={c.name} variant="event" />
            </a>
          )}
        </div>
        <div className="event-body">
          <a href={c.url} target="_blank" rel="noopener noreferrer">
            <h3>{c.name}</h3>
          </a>
          {d <= 0 && (
            <div className="event-timing">
              <span>{d < 0 ? '진행 중' : '오늘'}</span>
            </div>
          )}
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
            {type === 'hackathon' ? '모집·팀 규정 확인' : '프로그램·참가 안내'}
            <BriefIcon name="arrow" size={17} />
          </a>
          {source && (
            <details className="event-source">
              <summary>
                일정 출처
                {source.includes('CC BY-NC')
                  ? ' · Agenda · CC BY-NC 4.0'
                  : /\bMLH\b|Major League Hacking/i.test(source)
                    ? ' · MLH'
                    : ''}
              </summary>
              <p>{source}</p>
            </details>
          )}
        </div>
      </article>
    </li>
  );
}
