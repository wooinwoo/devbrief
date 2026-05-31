import { Suspense } from 'react';
import { ArticlesView } from '@/components/articles-view';
import { SiteNav } from '@/components/site-nav';
import type { ArticleDto } from '@/components/article-card';
import type { DigestDto } from '@/components/daily-digest';
import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { MOCK_VIDEOS, type VideoDto } from '@/lib/mock-videos';
import { MOCK_CONFERENCES, type ConferenceDto } from '@/lib/mock-conferences';

const API_BASE = 'http://localhost:4000/api/v1';

async function getArticles(): Promise<ArticleDto[]> {
  try {
    const res = await fetch(`${API_BASE}/articles?limit=30`, {
      cache: 'no-store',
    });
    if (!res.ok) return MOCK_ARTICLES;
    const data = (await res.json()) as ArticleDto[];
    return data.length > 0 ? data : MOCK_ARTICLES;
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
      date:
        typeof data.date === 'string'
          ? data.date
          : new Date(data.date).toISOString(),
      intro: data.intro ?? null,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch {
    return null;
  }
}

async function getVideos(): Promise<VideoDto[]> {
  try {
    const res = await fetch(`${API_BASE}/videos?limit=5`, {
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

export default async function Home() {
  const [articles, videos, conferences, digest] = await Promise.all([
    getArticles(),
    getVideos(),
    getConferences(),
    getDigest(),
  ]);

  return (
    <main
      className="min-h-screen w-full max-w-[1600px] px-6 sm:px-10 lg:px-16 xl:px-24 pt-12 pb-24 mx-auto"
      style={{ overflowX: 'clip' }}
    >
      <SiteNav />
      <Suspense fallback={null}>
        <ArticlesView
          articles={articles}
          videos={videos}
          conferences={conferences}
          digest={digest}
        />
      </Suspense>
    </main>
  );
}
