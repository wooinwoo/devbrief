import type { ArticleDto } from '@/components/article-card';
import { ArticlesView } from '@/components/articles-view';
import { parseArticleRows } from '@/lib/article-response';
import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { type ConferenceDto, MOCK_CONFERENCES } from '@/lib/mock-conferences';
import { MOCK_VIDEOS, type VideoDto } from '@/lib/mock-videos';
import { MOCKS_ENABLED } from '@/lib/mocks-enabled';
import { fetchVideos } from '@/lib/public-feeds';
import { publicRead } from '@/lib/public-read';
import { type ConferenceDto as ConferenceWire, TOTAL_COUNT_HEADER } from '@devbrief/shared';
import { Suspense } from 'react';

import { API_BASE } from '@/lib/api';

// mock 폴백은 개발 환경 한정 — 프로덕션은 빈 배열을 내려 각 탭의 빈 상태 UI 에 맡긴다.
function mockFallback<T>(mocks: T[]): T[] {
  return MOCKS_ENABLED ? mocks : [];
}

interface ArticlesPayload {
  articles: ArticleDto[];
  /** X-Total-Count 헤더의 전체 건수(offset/limit 무관) — 헤더 부재·폴백 경로면 null (감사 c62) */
  total: number | null;
}

/** X-Total-Count 파싱 — 없거나 음수/비정수면 null (전체 건수 미상으로 취급). */
function parseTotalCount(res: Response): number | null {
  const raw = res.headers.get(TOTAL_COUNT_HEADER);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

async function getArticles(errors: Set<string>): Promise<ArticlesPayload> {
  try {
    const res = await publicRead(`${API_BASE}/articles?limit=100`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Feed unavailable');
    const safe = parseArticleRows(await res.json());
    if (safe.length === 0) return { articles: mockFallback(MOCK_ARTICLES), total: null };
    return { articles: safe, total: parseTotalCount(res) };
  } catch {
    errors.add('개발 뉴스');
    return { articles: mockFallback(MOCK_ARTICLES), total: null };
  }
}

async function getConferences(errors: Set<string>): Promise<ConferenceDto[]> {
  try {
    const res = await publicRead(`${API_BASE}/conferences?upcoming=1&limit=12`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Feed unavailable');
    const data = (await res.json()) as ConferenceWire[];
    if (data.length === 0) return mockFallback(MOCK_CONFERENCES);
    return data.map((d) => ({
      id: d.id,
      name: d.name,
      url: d.url,
      startDate: d.startDate,
      endDate: d.endDate,
      location: d.location,
      topics: d.topics,
      description: d.description,
      imageUrl: d.imageUrl,
      brand: d.brandColor ?? undefined,
    }));
  } catch {
    errors.add('행사');
    return mockFallback(MOCK_CONFERENCES);
  }
}

async function getVideos(errors: Set<string>): Promise<VideoDto[]> {
  try {
    const data = await fetchVideos(2);
    return data.length ? data : mockFallback(MOCK_VIDEOS);
  } catch {
    errors.add('발표 영상');
    return mockFallback(MOCK_VIDEOS);
  }
}

export default async function Home() {
  const errors = new Set<string>();
  const [{ articles, total }, videos, conferences] = await Promise.all([
    getArticles(errors),
    getVideos(errors),
    getConferences(errors),
  ]);

  return (
    <main
      id="main-content"
      className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12"
    >
      <Suspense fallback={null}>
        <ArticlesView
          initialLoadErrors={[...errors]}
          loadConferenceCatalog
          loadTabCatalogs
          articles={articles}
          total={total}
          videos={videos}
          conferences={conferences}
        />
      </Suspense>
    </main>
  );
}
