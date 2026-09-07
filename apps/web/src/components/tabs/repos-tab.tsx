'use client';
import type { RepoDto } from '@/lib/mock-repos';
import { useMemo, useState } from 'react';
import { BriefIcon } from '../brief-icon';
import { SearchField } from '../filter-sidebar';
import { RepoCard } from '../repo-card';

const CATEGORY_LABEL: Record<string, string> = {
  ai: 'AI',
  web: '웹',
  infra: '인프라',
  cli: 'CLI',
  data: '데이터',
  etc: '기타',
};
export function ReposTab({ repos }: { repos: RepoDto[] }) {
  const [period, setPeriod] = useState<'weekly' | 'daily'>('weekly');
  const [language, setLanguage] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('growth');
  const periodRepos = useMemo(
    () => repos.filter((repo) => repo.period === period),
    [repos, period],
  );
  const languages = [
    ...new Set(
      periodRepos.map((repo) => repo.language).filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const categories = Object.keys(CATEGORY_LABEL).filter((value) =>
    periodRepos.some((repo) => repo.category === value),
  );
  const needle = query.trim().toLocaleLowerCase();
  const filtered = periodRepos
    .filter(
      (repo) =>
        (!language || repo.language === language) &&
        (!category || repo.category === category) &&
        (!needle ||
          [repo.fullName, repo.description, repo.language]
            .join(' ')
            .toLocaleLowerCase()
            .includes(needle)),
    )
    .sort((a, b) => (sort === 'stars' ? b.stars - a.stars : b.periodStars - a.periodStars));
  const activeFilters = Boolean(language || category || needle);
  const reset = () => {
    setLanguage('');
    setCategory('');
    setQuery('');
  };
  return (
    <section className="repo-directory" aria-label="오픈소스 탐색">
      <div className="directory-topline">
        <div className="period-switch" role="group" aria-label="기간 선택">
          {(
            [
              { value: 'weekly', label: '이번 주' },
              { value: 'daily', label: '오늘' },
            ] as const
          ).map((item) => (
            <button
              type="button"
              key={item.value}
              aria-pressed={period === item.value}
              onClick={() => {
                setPeriod(item.value);
                setLanguage('');
                setCategory('');
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p>GitHub Trending · 기간별 스타 증가량을 기준으로 수집해요.</p>
      </div>
      <div className="directory-toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="프로젝트 이름이나 설명 검색" />
        <label>
          언어
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="">모든 언어</option>
            {languages.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          분야
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">모든 분야</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="directory-results">
        <p role="status">
          <strong>{filtered.length}</strong>개 프로젝트
          {activeFilters && (
            <button type="button" onClick={reset}>
              필터 초기화
            </button>
          )}
        </p>
        <select
          aria-label="프로젝트 정렬"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="growth">스타 증가순</option>
          <option value="stars">누적 스타순</option>
        </select>
      </div>
      {filtered.length > 0 ? (
        <ul className="repo-grid" aria-label="오픈소스 프로젝트 목록">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </ul>
      ) : (
        <div className="library-empty">
          <span className="library-empty-icon">
            <BriefIcon name="search" size={28} />
          </span>
          <h2>
            {activeFilters ? '조건에 맞는 프로젝트가 없어요.' : '아직 수집된 프로젝트가 없어요.'}
          </h2>
          <p>
            {activeFilters
              ? '검색어를 줄이거나 언어·분야를 바꿔 보세요.'
              : '다른 기간의 오픈소스를 둘러보세요.'}
          </p>
          {activeFilters && (
            <button type="button" className="library-button" onClick={reset}>
              필터 초기화
            </button>
          )}
        </div>
      )}
    </section>
  );
}
