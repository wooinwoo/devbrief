'use client';

import {
  AI_HARNESSES,
  AI_MODELS,
  AI_THEMES,
  type AiFacet,
  harnessesOf,
  isAiArticle,
  modelsOf,
  themesOf,
} from '@/lib/ai-topics';
import { useUrlFilters } from '@/lib/use-url-filter';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ArticleDto } from '../article-card';
import { ArticleRow } from '../article-row';
import { BenchmarkDashboard } from '../benchmark-dashboard';
import { type FilterGroup, FilterSidebar } from '../filter-sidebar';
import { Pagination } from '../pagination';
import { SectionHeader } from '../section-header';

interface Props {
  articles: ArticleDto[];
  readSet: Set<string>;
  bookmarkSet?: Set<string>;
  onOpen: (id: string) => void;
  onBookmark?: (id: string) => void;
}

/** AI 탭 필터 조합 — faceted count 용으로 특정 그룹 조건만 뺀 부분 적용도 가능하게 분리 */
interface AiFilter {
  model?: string | null;
  harness?: string | null;
  theme?: string | null;
  query?: string;
}

function matchesAiFilter(a: ArticleDto, f: AiFilter): boolean {
  const q = (f.query ?? '').trim().toLowerCase();
  if (f.model && !modelsOf(a).some((x) => x.key === f.model)) return false;
  if (f.harness && !harnessesOf(a).some((x) => x.key === f.harness)) return false;
  if (f.theme && !themesOf(a).some((x) => x.key === f.theme)) return false;
  if (q) {
    const hay =
      `${a.title} ${a.titleKo ?? ''} ${a.summaryOneLine ?? ''} ${a.tags.join(' ')}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/**
 * 파셋 옵션 집계 — '목록'은 전체 AI 글 기준으로 고정하고(옵션이 나타났다 사라지지 않게),
 * 표시 '카운트'는 해당 그룹 조건을 뺀 나머지 필터(rest)를 적용한 부분집합 기준(faceted count).
 * 활성 옵션은 교차 카운트가 0이어도 목록에 남아 해제할 수 있다.
 */
function facetOptions(
  aiArticles: ArticleDto[],
  facets: AiFacet[],
  of: (a: ArticleDto) => AiFacet[],
  rest: AiFilter,
) {
  const sub = aiArticles.filter((a) => matchesAiFilter(a, rest));
  return facets
    .filter((f) => aiArticles.some((a) => of(a).some((x) => x.key === f.key)))
    .map((f) => ({
      value: f.key,
      label: f.label,
      color: f.color,
      count: sub.filter((a) => of(a).some((x) => x.key === f.key)).length,
    }));
}

export function AiTab({ articles, readSet, bookmarkSet, onOpen, onBookmark }: Props) {
  const aiArticles = useMemo(() => articles.filter(isAiArticle), [articles]);

  // 필터 상태는 URL 쿼리에서 파생 — articles 탭(q/source/cat/unread)과 같은 패턴.
  // 새로고침/뒤로가기/링크 공유 시 그대로 복원된다. 키는 탭 전환 시 서로 새어 들어가지
  // 않게 AI 탭 전용(model/tool/theme/aq)으로 분리.
  const { searchParams, setParam, setParamDebounced } = useUrlFilters();
  const model = searchParams.get('model') || null;
  const harness = searchParams.get('tool') || null;
  const theme = searchParams.get('theme') || null;
  const query = searchParams.get('aq') ?? '';

  const setModel = useCallback((v: string | null) => setParam('model', v), [setParam]);
  const setHarness = useCallback((v: string | null) => setParam('tool', v), [setParam]);
  const setTheme = useCallback((v: string | null) => setParam('theme', v), [setParam]);
  const setQuery = useCallback(
    (v: string) => setParamDebounced('aq', v.trim() || null),
    [setParamDebounced],
  );

  const modelOptions = useMemo(
    () => facetOptions(aiArticles, AI_MODELS, modelsOf, { harness, theme, query }),
    [aiArticles, harness, theme, query],
  );

  const harnessOptions = useMemo(
    () => facetOptions(aiArticles, AI_HARNESSES, harnessesOf, { model, theme, query }),
    [aiArticles, model, theme, query],
  );

  const themeOptions = useMemo(
    () => facetOptions(aiArticles, AI_THEMES, themesOf, { model, harness, query }),
    [aiArticles, model, harness, query],
  );

  const filtered = useMemo(
    () => aiArticles.filter((a) => matchesAiFilter(a, { model, harness, theme, query })),
    [aiArticles, model, harness, theme, query],
  );

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
            <SectionHeader label="필터된 소식" count={filtered.length} />
            <ul className="grid xl:grid-cols-2 gap-x-10">
              {pageSlice.map((a) => (
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
            <Pagination page={safePage} totalPages={totalPages} onChange={goPage} />
          </>
        ) : (
          <div className="flex flex-col gap-12">
            <BenchmarkDashboard />
            {themeGroups.map((g) => (
              <section key={g.theme.key}>
                <SectionHeader label={g.theme.label} count={g.articles.length} />
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
                <SectionHeader label="그 외 AI 소식" count={etcArticles.length} />
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
