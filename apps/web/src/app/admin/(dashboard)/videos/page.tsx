import { type AdminVideo, VideosPanel } from './videos-panel';

import { API_BASE } from '@/lib/api';

async function getVideos(): Promise<AdminVideo[]> {
  try {
    const res = await fetch(`${API_BASE}/videos?limit=100`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return (await res.json()) as AdminVideo[];
  } catch {
    return [];
  }
}

export default async function AdminVideosPage() {
  const videos = await getVideos();
  return (
    <div>
      <header className="mb-8">
        <h1
          className="text-[1.75rem] tracking-[-0.025em] mb-1"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          발표 영상
        </h1>
        <p className="text-[13px] max-w-2xl" style={{ color: 'var(--color-fg-muted)' }}>
          좋은 컨퍼런스 발표 YouTube URL 을 붙여넣으면 제목 / 썸네일 / 길이 / 챕터 / 요약을 자동으로
          채웁니다. 챕터는 유튜버 표시 → 영상 설명 → Gemini 자동 순으로 추출합니다.
        </p>
      </header>
      <VideosPanel initialVideos={videos} />
    </div>
  );
}
