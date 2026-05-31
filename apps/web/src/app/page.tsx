import { Suspense } from 'react';
import { ArticlesView } from '@/components/articles-view';
import { SiteNav } from '@/components/site-nav';
import type { ArticleDto } from '@/components/article-card';
import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { MOCK_VIDEOS, type VideoDto } from '@/lib/mock-videos';

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
  const [articles, videos] = await Promise.all([getArticles(), getVideos()]);

  return (
    <main
      className="min-h-screen px-6 sm:px-10 lg:px-16 xl:px-24 pt-12 pb-24 mx-auto"
      style={{ overflowX: 'clip' }}
    >
      <SiteNav />
      <Suspense fallback={null}>
        <ArticlesView articles={articles} videos={videos} />
      </Suspense>
    </main>
  );
}
