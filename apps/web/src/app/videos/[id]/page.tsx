import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/site-nav';
import { VideoDetail } from '@/components/video-detail';
import { MOCK_VIDEOS, type VideoDto } from '@/lib/mock-videos';

const API_BASE = 'http://localhost:4000/api/v1';

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
    brand: d.conference?.brandColor ?? undefined,
  };
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const fromApi = await getOne(id);
  const video = fromApi ?? MOCK_VIDEOS.find((v) => v.id === id);
  return {
    title: video ? `${video.title} · Pulse` : 'Pulse',
    description: video?.channel,
  };
}

export default async function VideoDetailPage({ params }: Props) {
  const { id } = await params;
  const [fromApi, all] = await Promise.all([getOne(id), getAll()]);
  const video = fromApi ?? MOCK_VIDEOS.find((v) => v.id === id);
  if (!video) notFound();

  const related = all
    .filter((v) => v.id !== video.id)
    .slice(0, 5);

  return (
    <main
      className="min-h-screen w-full max-w-3xl px-6 sm:px-10 lg:px-12 pt-12 pb-24 mx-auto"
      style={{ overflowX: 'clip' }}
    >
      <SiteNav />
      <VideoDetail video={video} related={related} />
    </main>
  );
}
