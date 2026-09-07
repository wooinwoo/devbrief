'use client';

import { daysUntil } from '@/lib/date-utils';
import { eventType } from '@/lib/event-type';
import type { ConferenceDto } from '@/lib/mock-conferences';
import { useState } from 'react';

const WEEKDAY = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' });

export function ConferenceCard({ conference: c }: { conference: ConferenceDto }) {
  const d = daysUntil(c.startDate);
  const hackathon = eventType(c) === 'hackathon';
  const [imageFailed, setImageFailed] = useState(false);
  const date = c.startDate.slice(0, 10);
  const end = c.endDate?.slice(0, 10);
  const sourceDescription = c.description?.startsWith('일정 출처:') ? c.description : null;
  const topics = c.topics.filter((topic) => !/^hackathon$/i.test(topic)).slice(0, 3);

  return (
    <li className="py-6 sm:py-7 border-b border-(--color-line) last:border-b-0">
      <article className="grid grid-cols-[3.5rem_minmax(0,1fr)] sm:grid-cols-[5rem_minmax(0,1fr)] gap-x-4 sm:gap-x-7">
        <time
          dateTime={date}
          className="flex flex-col items-start tabular-nums"
          aria-label={end && end !== date ? `${date}부터 ${end}까지` : date}
        >
          <span className="text-[11px] sm:text-xs text-(--color-fg-muted)">
            {date.slice(0, 7).replace('-', '.')}
          </span>
          <span className="text-[2rem] sm:text-[2.5rem] leading-[1.2] tracking-[-0.03em] font-semibold text-(--color-fg-strong)">
            {date.slice(8)}
          </span>
          <span className="mt-1 text-xs text-(--color-fg-muted)">
            {end && end !== date
              ? `~ ${end.slice(5).replace('-', '.')}`
              : WEEKDAY.format(new Date(c.startDate))}
          </span>
        </time>

        <div className="min-w-0">
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-accent)"
          >
            <div className="flex items-start gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-[17px] sm:text-[21px] font-semibold leading-snug tracking-[-0.02em] text-(--color-fg-strong) group-hover:underline decoration-1 underline-offset-4">
                    {c.name}
                  </h3>
                  <span
                    className={`shrink-0 text-xs font-medium ${hackathon ? 'text-(--color-accent)' : 'text-(--color-fg-muted)'}`}
                  >
                    {hackathon ? '해커톤' : '컨퍼런스'}
                  </span>
                  {d <= 0 && (
                    <span className="text-xs font-semibold text-(--color-accent)">
                      {d < 0 ? '진행 중' : '오늘'}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-(--color-fg-muted)">{c.location || '장소 미정'}</p>
                {!sourceDescription && c.description && (
                  <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-(--color-fg-default)">
                    {c.description}
                  </p>
                )}
                {topics.length > 0 && (
                  <p className="mt-2 text-xs text-(--color-fg-muted)">{topics.join(' · ')}</p>
                )}
                <span className="mt-3 inline-flex min-h-7 items-center text-[13px] font-medium text-(--color-fg-strong) group-hover:text-(--color-accent)">
                  {hackathon ? '모집·팀 규정 확인' : '프로그램·참가 안내'}
                  <svg
                    className="ml-2"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M7 17 17 7M7 7h10v10" />
                  </svg>
                </span>
              </div>
              {c.imageUrl && !imageFailed && (
                <img
                  src={c.imageUrl}
                  alt=""
                  loading="lazy"
                  onError={() => setImageFailed(true)}
                  className="hidden sm:block w-24 h-16 shrink-0 object-cover rounded-sm"
                />
              )}
            </div>
          </a>
          {sourceDescription && (
            <details className="mt-1 text-xs text-(--color-fg-muted)">
              <summary className="min-h-8 w-fit cursor-pointer py-2 hover:text-(--color-fg-strong)">
                일정 출처
                {sourceDescription.includes('CC BY-NC') ? ' · Agenda · CC BY-NC 4.0' : ' · MLH'}
              </summary>
              <p className="max-w-[65ch] pb-2 leading-relaxed break-words">{sourceDescription}</p>
            </details>
          )}
        </div>
      </article>
    </li>
  );
}
