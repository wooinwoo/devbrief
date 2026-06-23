'use client';

import { useMemo, useState } from 'react';
import { FilterSidebar, type FilterGroup } from '../filter-sidebar';
import { RepoCard } from '../repo-card';
import type { RepoDto } from '@/lib/mock-repos';

const CATEGORY_LABEL: Record<string, string> = {
  ai: 'AI',
  web: '웹',
  infra: '인프라',
  cli: 'CLI',
  data: '데이터',
  etc: '기타',
};

const CATEGORY_ORDER = ['ai', 'web', 'infra', 'cli', 'data', 'etc'];

interface Props {
  repos: RepoDto[];
}

export function ReposTab({ repos }: Props) {
  const [period, setPeriod] = useState<'weekly' | 'daily'>('weekly');
  const [language, setLanguage] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  // 기간 전환 시 필터 초기화 — 새 기간에 없는 언어/분야가 남아 "유령 필터"로
  // 빈 화면이 되는 걸 방지.
  const handlePeriodChange = (p: 'weekly' | 'daily') => {
    setPeriod(p);
    setLanguage(null);
    setCategory(null);
  };
  const resetFilters = () => {
    setLanguage(null);
    setCategory(null);
  };

  // 기간별로 먼저 분리
  const periodRepos = useMemo(
    () => repos.filter((r) => r.period === period),
    [repos, period],
  );

  // 언어 옵션 (현재 기간 기준, 등장 횟수순)
  const languageOptions = useMemo(() => {
    const map = new Map<string, { count: number; color: string | null }>();
    for (const r of periodRepos) {
      if (!r.language) continue;
      const cur = map.get(r.language) ?? { count: 0, color: r.languageColor };
      cur.count += 1;
      map.set(r.language, cur);
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([value, { count, color }]) => ({
        value,
        label: value,
        count,
        color: color ?? undefined,
      }));
  }, [periodRepos]);

  // 분야 옵션
  const categoryOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of periodRepos) map.set(r.category, (map.get(r.category) ?? 0) + 1);
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      value: c,
      label: CATEGORY_LABEL[c] ?? c,
      count: map.get(c) ?? 0,
    }));
  }, [periodRepos]);

  const filtered = useMemo(
    () =>
      periodRepos
        .filter((r) => (language ? r.language === language : true))
        .filter((r) => (category ? r.category === category : true))
        .sort((a, b) => b.periodStars - a.periodStars),
    [periodRepos, language, category],
  );

  const groups: FilterGroup[] = [
    {
      key: 'language',
      label: '언어',
      options: languageOptions,
      active: language,
      onSelect: setLanguage,
    },
    {
      key: 'category',
      label: '분야',
      options: categoryOptions,
      active: category,
      onSelect: setCategory,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <FilterSidebar groups={groups} />

      <div className="flex-1 min-w-0">
        {/* 상단: 안내문 + 기간 토글 */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <p
            className="text-[13px] leading-relaxed break-keep max-w-[42ch]"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            최근 {period === 'weekly' ? '한 주' : '하루'} 동안 star가 가장 가파르게
            오른 레포. 절대 규모가 아니라{' '}
            <span style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}>
              증가 속도
            </span>{' '}
            기준이라, 작아도 뜨는 중이면 잡힙니다.
          </p>
          <div className="w-[150px] shrink-0">
            <PeriodToggle period={period} onChange={handlePeriodChange} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div
            className="py-16 text-center text-[13.5px]"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            <p>조건에 맞는 레포가 없어요.</p>
            {(language || category) && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 text-[12px] underline underline-offset-2"
                style={{ color: 'var(--color-accent)', fontWeight: 600 }}
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <ul className="grid xl:grid-cols-2 gap-x-10 gap-y-1">
            {filtered.map((r, i) => (
              <RepoCard key={r.id} repo={r} index={i} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** 주간/일간 세그먼트 토글 (사이드바 상단) */
function PeriodToggle({
  period,
  onChange,
}: {
  period: 'weekly' | 'daily';
  onChange: (p: 'weekly' | 'daily') => void;
}) {
  const items: Array<{ value: 'weekly' | 'daily'; label: string }> = [
    { value: 'weekly', label: '이번 주' },
    { value: 'daily', label: '오늘' },
  ];
  return (
    <div
      className="flex p-0.5 rounded-lg"
      style={{ background: 'var(--color-bg-sunken)' }}
      role="group"
      aria-label="기간 선택"
    >
      {items.map((it) => {
        const active = period === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            aria-pressed={active}
            className="flex-1 py-1.5 rounded-md text-[12.5px] transition-colors"
            style={{
              background: active ? 'var(--color-bg-elevated)' : 'transparent',
              color: active
                ? 'var(--color-fg-strong)'
                : 'var(--color-fg-muted)',
              fontWeight: active ? 700 : 500,
              boxShadow: active ? '0 1px 2px oklch(0% 0 0 / 0.08)' : undefined,
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
