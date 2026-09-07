import type { ArticleDto } from '@/components/article-card';
import { ArticlesView } from '@/components/articles-view';
import type { DigestDto } from '@/components/daily-digest';
import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { type ConferenceDto, MOCK_CONFERENCES } from '@/lib/mock-conferences';
import { MOCK_REPOS, type RepoDto } from '@/lib/mock-repos';
import { MOCK_VIDEOS, type VideoDto } from '@/lib/mock-videos';
import { MOCKS_ENABLED } from '@/lib/mocks-enabled';
import {
  type ArticleListItem,
  type ConferenceDto as ConferenceWire,
  type DailyDigestDto,
  TOTAL_COUNT_HEADER,
  type VideoDto as VideoWire,
} from '@devbrief/shared';
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

async function getArticles(): Promise<ArticlesPayload> {
  try {
    const res = await fetch(`${API_BASE}/articles?limit=100`, {
      cache: 'no-store',
    });
    if (!res.ok) return { articles: mockFallback(MOCK_ARTICLES), total: null };
    const data = (await res.json()) as ArticleListItem[];
    // 실데이터의 tags/source 누락 방어 (백엔드 응답에 null 가능)
    const safe = data.map((a) => ({
      ...a,
      tags: a.tags ?? [],
      source: a.source ?? { name: '출처 미상', provider: 'rss_generic' },
    }));
    if (safe.length === 0) return { articles: mockFallback(MOCK_ARTICLES), total: null };
    return { articles: safe, total: parseTotalCount(res) };
  } catch {
    return { articles: mockFallback(MOCK_ARTICLES), total: null };
  }
}

async function getConferences(): Promise<ConferenceDto[]> {
  try {
    const res = await fetch(`${API_BASE}/conferences?upcoming=1&limit=12`, { cache: 'no-store' });
    if (!res.ok) return mockFallback(MOCK_CONFERENCES);
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
    return mockFallback(MOCK_CONFERENCES);
  }
}

async function getDigest(): Promise<DigestDto | null> {
  try {
    const res = await fetch(`${API_BASE}/digest/today`, { cache: 'no-store' });
    if (!res.ok) return null;
    // 그 날 다이제스트가 없으면 본문이 JSON null — DailyDigest 전체 행이 계약이다.
    const data = (await res.json()) as DailyDigestDto | null;
    if (!data) return null;
    return {
      date: typeof data.date === 'string' ? data.date : new Date(data.date).toISOString(),
      intro: data.intro ?? null,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch {
    return null;
  }
}

async function getVideos(): Promise<VideoDto[]> {
  try {
    const res = await fetch(`${API_BASE}/videos?limit=100`, {
      cache: 'no-store',
    });
    if (!res.ok) return mockFallback(MOCK_VIDEOS);
    const data = (await res.json()) as VideoWire[];
    if (data.length === 0) return mockFallback(MOCK_VIDEOS);
    return data.map((d) => ({
      id: d.id,
      videoId: d.videoId,
      title: d.title,
      url: d.url,
      channel: d.channel,
      thumbnailUrl: d.thumbnailUrl,
      durationSec: d.durationSec,
      views: d.views,
      publishedAt: d.publishedAt,
      topics: d.topics,
      brand: d.conference?.brandColor ?? undefined,
    }));
  } catch {
    return mockFallback(MOCK_VIDEOS);
  }
}

async function getRepos(): Promise<RepoDto[]> {
  try {
    const [w, d] = await Promise.all([
      fetch(`${API_BASE}/repos?period=weekly`, { cache: 'no-store' }),
      fetch(`${API_BASE}/repos?period=daily`, { cache: 'no-store' }),
    ]);
    if (!w.ok && !d.ok) return mockFallback(MOCK_REPOS);
    const weekly = w.ok ? ((await w.json()) as RepoDto[]) : [];
    const daily = d.ok ? ((await d.json()) as RepoDto[]) : [];
    const merged = [...weekly, ...daily];
    return merged.length > 0 ? merged : mockFallback(MOCK_REPOS);
  } catch {
    return mockFallback(MOCK_REPOS);
  }
}

export default async function Home() {
  const [{ articles, total }, videos, conferences, digest, repos] = await Promise.all([
    getArticles(),
    getVideos(),
    getConferences(),
    getDigest(),
    getRepos(),
  ]);

  return (
    <main
      id="main-content"
      className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12"
    >
      <Suspense fallback={null}>
        <ArticlesView
          loadConferenceCatalog
          articles={articles}
          total={total}
          videos={videos}
          conferences={conferences}
          digest={digest}
          repos={repos}
        />
      </Suspense>
    </main>
  );
}
