import type { ArticleDto } from '@/components/article-card';
import { ArticlesView } from '@/components/articles-view';
import type { DigestDto } from '@/components/daily-digest';
import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { type ConferenceDto, MOCK_CONFERENCES } from '@/lib/mock-conferences';
import { MOCK_REPOS, type RepoDto } from '@/lib/mock-repos';
import { MOCK_VIDEOS, type VideoDto } from '@/lib/mock-videos';
import { Suspense } from 'react';

import { API_BASE } from '@/lib/api';

async function getArticles(): Promise<ArticleDto[]> {
  try {
    const res = await fetch(`${API_BASE}/articles?limit=100`, {
      cache: 'no-store',
    });
    if (!res.ok) return MOCK_ARTICLES;
    const data = (await res.json()) as ArticleDto[];
    // 실데이터의 tags/source 누락 방어 (백엔드 응답에 null 가능)
    const safe = data.map((a) => ({
      ...a,
      tags: a.tags ?? [],
      source: a.source ?? { name: '출처 미상', provider: 'rss_generic' },
    }));
    return safe.length > 0 ? safe : MOCK_ARTICLES;
  } catch {
    return MOCK_ARTICLES;
  }
}

interface DbVideo {
  id: string;
  videoId: string;
  title: string;
  url: string;
  channel: string;
  thumbnailUrl: string;
  durationSec: number;
  views: number;
  publishedAt: string;
  topics: string[];
  conference?: { name: string; brandColor: string | null } | null;
}

interface DbConference {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate: string | null;
  location: string;
  topics: string[];
  description: string | null;
  imageUrl: string | null;
  brandColor: string | null;
}

async function getConferences(): Promise<ConferenceDto[]> {
  try {
    const res = await fetch(`${API_BASE}/conferences`, { cache: 'no-store' });
    if (!res.ok) return MOCK_CONFERENCES;
    const data = (await res.json()) as DbConference[];
    if (data.length === 0) return MOCK_CONFERENCES;
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
    return MOCK_CONFERENCES;
  }
}

async function getDigest(): Promise<DigestDto | null> {
  try {
    const res = await fetch(`${API_BASE}/digest/today`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
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
    const res = await fetch(`${API_BASE}/videos?limit=48`, {
      cache: 'no-store',
    });
    if (!res.ok) return MOCK_VIDEOS;
    const data = (await res.json()) as DbVideo[];
    if (data.length === 0) return MOCK_VIDEOS;
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
    return MOCK_VIDEOS;
  }
}

async function getRepos(): Promise<RepoDto[]> {
  try {
    const [w, d] = await Promise.all([
      fetch(`${API_BASE}/repos?period=weekly`, { cache: 'no-store' }),
      fetch(`${API_BASE}/repos?period=daily`, { cache: 'no-store' }),
    ]);
    if (!w.ok && !d.ok) return MOCK_REPOS;
    const weekly = w.ok ? ((await w.json()) as RepoDto[]) : [];
    const daily = d.ok ? ((await d.json()) as RepoDto[]) : [];
    const merged = [...weekly, ...daily];
    return merged.length > 0 ? merged : MOCK_REPOS;
  } catch {
    return MOCK_REPOS;
  }
}

export default async function Home() {
  const [articles, videos, conferences, digest, repos] = await Promise.all([
    getArticles(),
    getVideos(),
    getConferences(),
    getDigest(),
    getRepos(),
  ]);

  return (
    <main
      id="main-content"
      className="min-h-screen w-full px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32"
    >
      <Suspense fallback={null}>
        <ArticlesView
          articles={articles}
          videos={videos}
          conferences={conferences}
          digest={digest}
          repos={repos}
        />
      </Suspense>
    </main>
  );
}
