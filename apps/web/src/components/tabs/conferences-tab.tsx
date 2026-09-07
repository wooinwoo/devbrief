'use client';

import { daysUntil, isUpcomingEvent } from '@/lib/date-utils';
import { type EventType, eventType } from '@/lib/event-type';
import type { ConferenceDto } from '@/lib/mock-conferences';
import { useMemo, useState } from 'react';
import { ConferenceCard } from '../conference-card';
import { SearchField } from '../filter-sidebar';
import { Pagination } from '../pagination';

type Period = 'soon' | 'month1' | 'month2' | 'later';
type Kind = 'all' | EventType;
const KINDS: { value: Kind; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'conference', label: '컨퍼런스' },
  { value: 'hackathon', label: '해커톤' },
];
const PERIOD_LABEL: Record<Period, string> = {
  soon: '한 달 내',
  month1: '1~2개월',
  month2: '2~3개월',
  later: '3개월 이후',
};
const SELECT_CLASS =
  'w-full min-h-11 rounded-md border border-(--color-line-strong) bg-(--color-bg-base) px-3 py-2 text-[16px] sm:text-sm text-(--color-fg-strong)';

function periodOf(iso: string): Period {
  const d = daysUntil(iso);
  return d <= 30 ? 'soon' : d <= 60 ? 'month1' : d <= 90 ? 'month2' : 'later';
}

export function ConferencesTab({ conferences }: { conferences: ConferenceDto[] }) {
  const [kind, setKind] = useState<Kind>('all');
  const [period, setPeriod] = useState('');
  const [topic, setTopic] = useState('');
  const [sort, setSort] = useState('soonest');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const upcoming = useMemo(() => conferences.filter(isUpcomingEvent), [conferences]);
  const typed = useMemo(
    () => upcoming.filter((c) => kind === 'all' || eventType(c) === kind),
    [upcoming, kind],
  );
  const topicOptions = useMemo(
    () =>
      [...new Set(typed.flatMap((c) => c.topics))]
        .filter((t) => !/^hackathon$/i.test(t))
        .sort((a, b) => a.localeCompare(b)),
    [typed],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return typed
      .filter(
        (c) =>
          (!needle ||
            [c.name, c.location, ...c.topics].join(' ').toLocaleLowerCase().includes(needle)) &&
          (!period || periodOf(c.startDate) === period) &&
          (!topic || c.topics.includes(topic)),
      )
      .sort((a, b) =>
        sort === 'soonest'
          ? a.startDate.localeCompare(b.startDate)
          : b.startDate.localeCompare(a.startDate),
      );
  }, [typed, period, topic, sort, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 24));
  const currentPage = Math.min(page, totalPages);
  const activeFilters = kind !== 'all' || !!(period || topic || query);
  const reset = () => {
    setKind('all');
    setPeriod('');
    setTopic('');
    setQuery('');
    setPage(1);
  };

  return (
    <div>
      <div
        role="group"
        aria-label="행사 유형"
        className="grid grid-cols-3 sm:flex border-b border-(--color-line-strong) mb-6"
      >
        {KINDS.map(({ value, label }) => {
          const count =
            value === 'all'
              ? upcoming.length
              : upcoming.filter((c) => eventType(c) === value).length;
          const active = kind === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setKind(value);
                setTopic('');
                setPage(1);
              }}
              className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-14 px-2 sm:px-6 pb-3 pt-2 text-sm sm:text-base border-b-2 -mb-px transition-colors ${active ? 'border-(--color-fg-strong) text-(--color-fg-strong) font-semibold' : 'border-transparent text-(--color-fg-muted) hover:text-(--color-fg-strong)'}`}
            >
              {label}{' '}
              <span className="text-xs font-normal tabular-nums text-(--color-fg-muted)">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_180px] gap-3">
        <div className="col-span-2 lg:col-span-1">
          <SearchField
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="행사명, 지역, 주제로 검색"
          />
        </div>
        <label>
          <span className="sr-only">개최 시기</span>
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="">모든 시기</option>
            {Object.entries(PERIOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}{' '}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">행사 주제</span>
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="">모든 주제</option>
            {topicOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-4 pb-3 border-b border-(--color-line)">
        <p role="status" className="text-sm text-(--color-fg-muted)">
          <span className="font-semibold tabular-nums text-(--color-fg-strong)">
            {filtered.length}
          </span>
          개 일정
        </p>
        {activeFilters && (
          <button
            type="button"
            onClick={reset}
            className="min-h-11 px-1 text-xs underline underline-offset-4 text-(--color-fg-muted)"
          >
            초기화
          </button>
        )}
        <label className="ml-auto">
          <span className="sr-only">일정 정렬</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="min-h-11 max-w-full bg-transparent text-sm text-(--color-fg-muted) px-2"
          >
            <option value="soonest">가까운 순</option>
            <option value="latest">나중 순</option>
          </select>
        </label>
      </div>

      {filtered.length ? (
        <ul aria-label="행사 일정">
          {filtered.slice((currentPage - 1) * 24, currentPage * 24).map((c) => (
            <ConferenceCard key={c.id} conference={c} />
          ))}
        </ul>
      ) : (
        <div className="py-16 text-center">
          <p className="text-base font-medium text-(--color-fg-strong)">
            {typed.length === 0 && kind !== 'all'
              ? `아직 공개된 ${kind === 'hackathon' ? '해커톤이' : '컨퍼런스가'} 없어요.`
              : '조건에 맞는 행사가 없어요.'}
          </p>
          <p className="mt-2 text-sm text-(--color-fg-muted)">
            다른 유형이나 검색어로 일정을 찾아보세요.
          </p>
          {activeFilters && (
            <button
              type="button"
              onClick={reset}
              className="mt-4 min-h-11 px-4 text-sm underline underline-offset-4 text-(--color-accent)"
            >
              전체 행사 보기
            </button>
          )}
        </div>
      )}
      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
