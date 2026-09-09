import { LoadFailure } from '@/components/load-failure';
import { SiteNav } from '@/components/site-nav';
import { VideoDetail } from '@/components/video-detail';
import { MOCK_VIDEOS, type VideoDto } from '@/lib/mock-videos';
import { MOCKS_ENABLED } from '@/lib/mocks-enabled';
import { publicRead } from '@/lib/public-read';
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

async function getOne(id: string): Promise<VideoDto | null | undefined> {
  try {
    const res = await publicRead(`${API_BASE}/videos/${id}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    const d = (await res.json()) as DbVideo;
    return mapDbToDto(d);
  } catch {
    return undefined;
  }
}

// 관련 영상 목록: mock 폴백은 개발 환경 한정 — 프로덕션은 빈 배열로 섹션을 숨긴다.
async function getAll(): Promise<VideoDto[]> {
  try {
    const res = await publicRead(`${API_BASE}/videos?limit=20`, {
      cache: 'no-store',
    });
    if (!res.ok) return mockFallback();
    const data = (await res.json()) as DbVideo[];
    return data.length > 0 ? data.map(mapDbToDto) : mockFallback();
  } catch {
    return mockFallback();
  }
}

function mockFallback(): VideoDto[] {
  return MOCKS_ENABLED ? MOCK_VIDEOS : [];
}

// mock 영상 상세(v1~)는 개발 환경 한정 — 프로덕션은 notFound 로 떨어진다.
function findMockVideo(id: string): VideoDto | undefined {
  return MOCKS_ENABLED ? MOCK_VIDEOS.find((v) => v.id === id) : undefined;
}

function mapDbToDto(d: DbVideo): VideoDto {
  if (
    !d ||
    typeof d.id !== 'string' ||
    typeof d.title !== 'string' ||
    typeof d.videoId !== 'string' ||
    typeof d.url !== 'string'
  )
    throw new Error('Invalid video');
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
  const video = fromApi ?? findMockVideo(id);
  return {
    title: video ? `${video.title} · Devbrief` : 'Devbrief',
    description: video?.channel,
  };
}

export default async function VideoDetailPage({ params }: Props) {
  const { id } = await params;
  const [fromApi, all] = await Promise.all([getOne(id), getAll()]);
  const video = fromApi ?? findMockVideo(id);
  if (!video && fromApi === undefined)
    return (
      <main id="main-content" className="mx-auto max-w-4xl px-5">
        <SiteNav />
        <LoadFailure />
      </main>
    );
  if (!video) notFound();

  const related = all.filter((v) => v.id !== video.id).slice(0, 5);

  return (
    <main
      id="main-content"
      className="min-h-screen w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32"
    >
      <SiteNav />
      <div className="max-w-6xl mx-auto pb-16 sm:pb-24">
        <VideoDetail video={video} related={related} />
      </div>
    </main>
  );
}
