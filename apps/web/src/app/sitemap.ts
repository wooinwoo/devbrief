import { API_BASE } from '@/lib/api';
import { publicRead } from '@/lib/public-read';
import { SITE_URL } from '@/lib/site';
import type { MetadataRoute } from 'next';

interface Item {
  id: string;
  publishedAt: string;
}

// ponytail: 목록마다 최신 100건(API 상한)만 넣는다. 오래된 글까지 색인해야 하면 offset으로 나눠 sitemap index를 만든다.
async function latest(path: 'articles' | 'videos'): Promise<Item[]> {
  try {
    const res = await publicRead(`${API_BASE}/${path}?limit=100`, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as Item[]) : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, videos] = await Promise.all([latest('articles'), latest('videos')]);
  const entry = (path: string) => (item: Item) => ({
    url: `${SITE_URL}/${path}/${item.id}`,
    lastModified: item.publishedAt,
  });
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/conferences`, changeFrequency: 'weekly', priority: 0.8 },
    ...articles.map(entry('articles')),
    ...videos.map(entry('videos')),
  ];
}
