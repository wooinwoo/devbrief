import { SiteNav } from '@/components/site-nav';
import { VideoDetail } from '@/components/video-detail';
import { MOCK_VIDEOS, type VideoDto } from '@/lib/mock-videos';
import { notFound } from 'next/navigation';

import { API_BASE } from '@/lib/api';

interface Props {
  params: Promise<{ id: string }>;
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
  description: string | null;
  summary: string | null;
  chapters: Array<{ time: number; label: string }> | null;
  chapterSource: 'official' | 'description' | 'ai' | null;
  conference?: { name: string; brandColor: string | null } | null;
}

async function getOne(id: string): Promise<VideoDto | null> {
  try {
    const res = await fetch(`${API_BASE}/videos/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const d = (await res.json()) as DbVideo;
    return mapDbToDto(d);
  } catch {
    return null;
  }
}

async function getAll(): Promise<VideoDto[]> {
  try {
    const res = await fetch(`${API_BASE}/videos?limit=20`, {
      cache: 'no-store',
    });
    if (!res.ok) return MOCK_VIDEOS;
    const data = (await res.json()) as DbVideo[];
    return data.length > 0 ? data.map(mapDbToDto) : MOCK_VIDEOS;
  } catch {
    return MOCK_VIDEOS;
  }
}

function mapDbToDto(d: DbVideo): VideoDto {
  return {
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
    description: d.description,
    summary: d.summary,
    chapters: d.chapters,
    chapterSource: d.chapterSource,
    brand: d.conference?.brandColor ?? undefined,
  };
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const fromApi = await getOne(id);
  const video = fromApi ?? MOCK_VIDEOS.find((v) => v.id === id);
  return {
    title: video ? `${video.title} · Devbrief` : 'Devbrief',
    description: video?.channel,
  };
}

export default async function VideoDetailPage({ params }: Props) {
  const { id } = await params;
  const [fromApi, all] = await Promise.all([getOne(id), getAll()]);
  const video = fromApi ?? MOCK_VIDEOS.find((v) => v.id === id);
  if (!video) notFound();

  const related = all.filter((v) => v.id !== video.id).slice(0, 5);

  return (
    <main className="min-h-screen w-full px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32">
      <SiteNav />
      <div className="max-w-6xl mx-auto">
        <VideoDetail video={video} related={related} />
      </div>
    </main>
  );
}
