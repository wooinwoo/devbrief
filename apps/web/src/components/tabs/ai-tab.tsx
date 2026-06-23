'use client';

import {
  AI_HARNESSES,
  AI_MODELS,
  AI_THEMES,
  harnessesOf,
  isAiArticle,
  modelsOf,
  themesOf,
} from '@/lib/ai-topics';
import { useEffect, useMemo, useState } from 'react';
import type { ArticleDto } from '../article-card';
import { ArticleRow } from '../article-row';
import { BenchmarkDashboard } from '../benchmark-dashboard';
import { type FilterGroup, FilterSidebar } from '../filter-sidebar';
import { Pagination } from '../pagination';
import { SectionHeader } from '../section-header';

function AiSectionHeader({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span
        aria-hidden
        className="inline-block w-1 h-5 rounded-full"
        style={{ background: color }}
      />
      <h2
        className="text-[1.125rem] leading-none tracking-[-0.015em]"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 800 }}
      >
        {label}
      </h2>
      <span
        className="text-[12px] tabular-nums px-2 py-0.5 rounded-full"
        style={{
          color: 'var(--color-fg-muted)',
          background: 'var(--color-bg-sunken)',
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </div>
  );
}

interface Props {
  articles: ArticleDto[];
  readSet: Set<string>;
  bookmarkSet?: Set<string>;
  onOpen: (id: string) => void;
  onBookmark?: (id: string) => void;
}

export function AiTab({ articles, readSet, bookmarkSet, onOpen, onBookmark }: Props) {
  const aiArticles = useMemo(() => articles.filter(isAiArticle), [articles]);
  const [model, setModel] = useState<string | null>(null);
  const [harness, setHarness] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const modelOptions = useMemo(
    () =>
      AI_MODELS.map((m) => ({
        value: m.key,
        label: m.label,
        color: m.color,
        count: aiArticles.filter((a) => modelsOf(a).some((x) => x.key === m.key)).length,
      })).filter((o) => o.count > 0),
    [aiArticles],
  );

  const harnessOptions = useMemo(
    () =>
      AI_HARNESSES.map((h) => ({
        value: h.key,
        label: h.label,
        color: h.color,
        count: aiArticles.filter((a) => harnessesOf(a).some((x) => x.key === h.key)).length,
      })).filter((o) => o.count > 0),
    [aiArticles],
  );

  const themeOptions = useMemo(
    () =>
      AI_THEMES.map((t) => ({
        value: t.key,
        label: t.label,
        color: t.color,
        count: aiArticles.filter((a) => themesOf(a).some((x) => x.key === t.key)).length,
      })).filter((o) => o.count > 0),
    [aiArticles],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return aiArticles.filter((a) => {
      if (model && !modelsOf(a).some((x) => x.key === model)) return false;
      if (harness && !harnessesOf(a).some((x) => x.key === harness)) return false;
      if (theme && !themesOf(a).some((x) => x.key === theme)) return false;
      if (q) {
        const hay =
          `${a.title} ${a.titleKo ?? ''} ${a.summaryOneLine ?? ''} ${a.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [aiArticles, model, harness, theme, query]);

  const isFiltering = !!(model || harness || theme || query.trim());

  // 각 글에 붙일 모델·하네스 배지 (어떤 모델/도구 글인지 한눈에)
  const badgesOf = (a: ArticleDto) =>
    [...modelsOf(a), ...harnessesOf(a)]
      .slice(0, 2)
      .map((x) => ({ label: x.label, color: x.color }));

  // 필터 없을 때: 주제별 섹션으로 정리 (글은 첫 매칭 주제에 배치)
  const themeGroups = useMemo(() => {
    if (isFiltering) return [];
    return AI_THEMES.map((t) => ({
      theme: t,
      articles: filtered.filter((a) => {
        const ts = themesOf(a);
        return ts.length > 0 && ts[0].key === t.key;
      }),
    })).filter((g) => g.articles.length > 0);
  }, [filtered, isFiltering]);

  const etcArticles = useMemo(
    () => (isFiltering ? [] : filtered.filter((a) => themesOf(a).length === 0)),
    [filtered, isFiltering],
  );

  const PER_PAGE = 20;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [model, harness, theme, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const pageSlice = filtered.slice(start, start + PER_PAGE);
  const goPage = (p: number) => {
    setPage(p);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const groups: FilterGroup[] = [
    {
      key: 'model',
      label: '모델',
      options: modelOptions,
      active: model,
      onSelect: setModel,
    },
    {
      key: 'harness',
      label: '하네스·도구',
      options: harnessOptions,
      active: harness,
      onSelect: setHarness,
    },
    {
      key: 'theme',
      label: '주제',
      options: themeOptions,
      active: theme,
      onSelect: setTheme,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <FilterSidebar
        groups={groups}
        search={{ value: query, onChange: setQuery, placeholder: 'AI 소식 검색' }}
      />

      <div className="flex-1 min-w-0">
        {aiArticles.length === 0 ? (
          <p className="py-12 text-center text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            아직 모인 AI 소식이 없어요. AI 전문 소스 수집이 돌면 채워집니다.
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            조건에 맞는 AI 소식이 없어요.
          </p>
        ) : isFiltering ? (
          <>
            <SectionHeader label="필터된 소식" count={filtered.length} hint="filtered" />
            <ul className="grid xl:grid-cols-2 gap-x-10">
              {pageSlice.map((a, i) => (
                <ArticleRow
                  key={a.id}
                  article={a}
                  read={readSet.has(a.id)}
                  bookmarked={bookmarkSet?.has(a.id)}
                  onOpen={() => onOpen(a.id)}
                  onBookmark={onBookmark}
                  index={start + i}
                  badges={badgesOf(a)}
                />
              ))}
            </ul>
            <Pagination page={safePage} totalPages={totalPages} onChange={goPage} />
          </>
        ) : (
          <div className="flex flex-col gap-12">
            <BenchmarkDashboard />
            {themeGroups.map((g) => (
              <section key={g.theme.key}>
                <AiSectionHeader
                  color={g.theme.color}
                  label={g.theme.label}
                  count={g.articles.length}
                />
                <ul className="grid xl:grid-cols-2 gap-x-10">
                  {g.articles.map((a) => (
                    <ArticleRow
                      key={a.id}
                      article={a}
                      read={readSet.has(a.id)}
                      bookmarked={bookmarkSet?.has(a.id)}
                      onOpen={() => onOpen(a.id)}
                      onBookmark={onBookmark}
                      badges={badgesOf(a)}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {etcArticles.length > 0 && (
              <section>
                <AiSectionHeader
                  color="var(--color-fg-subtle)"
                  label="그 외 AI 소식"
                  count={etcArticles.length}
                />
                <ul className="grid xl:grid-cols-2 gap-x-10">
                  {etcArticles.map((a) => (
                    <ArticleRow
                      key={a.id}
                      article={a}
                      read={readSet.has(a.id)}
                      bookmarked={bookmarkSet?.has(a.id)}
                      onOpen={() => onOpen(a.id)}
                      onBookmark={onBookmark}
                      badges={badgesOf(a)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
