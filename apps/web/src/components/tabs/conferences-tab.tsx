'use client';

import { useMemo, useState } from 'react';
import { ConferenceCard } from '../conference-card';
import { FilterSidebar, type FilterGroup } from '../filter-sidebar';
import type { ConferenceDto } from '@/lib/mock-conferences';
import { daysUntil } from '@/lib/date-utils';

type Period = 'soon' | 'month1' | 'month2' | 'later';

function periodOf(iso: string): Period {
  const d = daysUntil(iso);
  if (d <= 30) return 'soon';
  if (d <= 60) return 'month1';
  if (d <= 90) return 'month2';
  return 'later';
}

const PERIOD_LABEL: Record<Period, string> = {
  soon: '한 달 내',
  month1: '1~2개월',
  month2: '2~3개월',
  later: '3개월 이후',
};

export function ConferencesTab({
  conferences,
}: {
  conferences: ConferenceDto[];
}) {
  const [period, setPeriod] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [sort, setSort] = useState<'soonest' | 'latest'>('soonest');

  const upcoming = useMemo(
    () => conferences.filter((c) => daysUntil(c.startDate) >= 0),
    [conferences],
  );

  // 토픽 집계
  const topicOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of upcoming)
      for (const t of c.topics) map.set(t, (map.get(t) ?? 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }));
  }, [upcoming]);

  const periodOptions = useMemo(() => {
    const map = new Map<Period, number>();
    for (const c of upcoming) {
      const p = periodOf(c.startDate);
      map.set(p, (map.get(p) ?? 0) + 1);
    }
    return (['soon', 'month1', 'month2', 'later'] as Period[])
      .filter((p) => map.has(p))
      .map((p) => ({ value: p, label: PERIOD_LABEL[p], count: map.get(p)! }));
  }, [upcoming]);

  const filtered = useMemo(() => {
    let list = upcoming;
    if (period) list = list.filter((c) => periodOf(c.startDate) === period);
    if (topic) list = list.filter((c) => c.topics.includes(topic));
    return [...list].sort((a, b) => {
      const da = new Date(a.startDate).getTime();
      const db = new Date(b.startDate).getTime();
      return sort === 'soonest' ? da - db : db - da;
    });
  }, [upcoming, period, topic, sort]);

  const groups: FilterGroup[] = [
    {
      key: 'period',
      label: '시기',
      options: periodOptions,
      active: period,
      onSelect: setPeriod,
    },
    {
      key: 'topic',
      label: '주제',
      options: topicOptions,
      active: topic,
      onSelect: setTopic,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <FilterSidebar groups={groups} />

      <div className="flex-1 min-w-0">
        <div
          className="flex items-baseline gap-4 mb-6 pt-1 border-t-2"
          style={{ borderColor: 'var(--color-fg-strong)' }}
        >
          <span
            className="text-[14px] tracking-[-0.005em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            <span style={{ color: 'var(--color-accent)' }}>{filtered.length}</span> 개
          </span>
          <span className="flex-1" />
          <SortLink active={sort === 'soonest'} onClick={() => setSort('soonest')}>
            가까운 순
          </SortLink>
          <SortLink active={sort === 'latest'} onClick={() => setSort('latest')}>
            나중 순
          </SortLink>
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            조건에 맞는 컨퍼런스가 없어요.
          </p>
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c, i) => (
              <ConferenceCard key={c.id} conference={c} index={i} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SortLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12.5px] transition-colors"
      style={{
        color: active ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
        fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </button>
  );
}
