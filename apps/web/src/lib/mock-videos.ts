export interface VideoDto {
  id: string;
  title: string;
  url: string;
  channel: string;
  thumbnail: string;
  duration: string;
  views: string;
  publishedAt: string;
  topics: string[];
}

// 컨퍼런스 발표 영상 mock (V1.5에서 YouTube API 연동)
export const MOCK_VIDEOS: VideoDto[] = [
  {
    id: 'v1',
    title: '대규모 트래픽에서의 토스 서버 아키텍처',
    url: 'https://youtube.com',
    channel: 'TOSS SLASH',
    thumbnail:
      'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80&auto=format&fit=crop',
    duration: '42:18',
    views: '12K',
    publishedAt: '2026-05-28T00:00:00Z',
    topics: ['Backend', '아키텍처'],
  },
  {
    id: 'v2',
    title: 'React Server Components 실전 도입기',
    url: 'https://youtube.com',
    channel: 'FECONF',
    thumbnail:
      'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80&auto=format&fit=crop',
    duration: '38:22',
    views: '8.2K',
    publishedAt: '2026-05-27T00:00:00Z',
    topics: ['React', 'RSC'],
  },
  {
    id: 'v3',
    title: 'LLM 서빙 비용 80% 줄이기 — vLLM 운영 사례',
    url: 'https://youtube.com',
    channel: 'if(kakao)dev',
    thumbnail:
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80&auto=format&fit=crop',
    duration: '51:04',
    views: '24K',
    publishedAt: '2026-05-26T00:00:00Z',
    topics: ['AI', 'LLM', 'Infra'],
  },
  {
    id: 'v4',
    title: 'PostgreSQL 인덱스 디자인의 함정',
    url: 'https://youtube.com',
    channel: 'DEVIEW',
    thumbnail:
      'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&q=80&auto=format&fit=crop',
    duration: '29:47',
    views: '15K',
    publishedAt: '2026-05-25T00:00:00Z',
    topics: ['DB', 'Postgres'],
  },
  {
    id: 'v5',
    title: 'Vector DB 직접 만들어보기 — Rust 구현',
    url: 'https://youtube.com',
    channel: 'PyCon Korea',
    thumbnail:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&auto=format&fit=crop',
    duration: '47:13',
    views: '6.8K',
    publishedAt: '2026-05-24T00:00:00Z',
    topics: ['Rust', 'VectorDB'],
  },
];
