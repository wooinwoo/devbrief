export interface VideoDto {
  id: string;
  videoId: string; // YouTube videoId (i.ytimg.com 썸네일 기준)
  title: string;
  url: string;
  channel: string;
  thumbnailUrl: string; // 실제 운영 시 i.ytimg.com/vi/{videoId}/maxresdefault.jpg
  durationSec: number; // YouTube contentDetails.duration 파싱 결과
  views: number;
  publishedAt: string;
  topics: string[];
  brand?: string; // 채널/컨퍼런스 brand 색
}

// 컨퍼런스 발표 영상 mock. 실제 운영 시 YouTube Data API 동기화 결과로 대체.
export const MOCK_VIDEOS: VideoDto[] = [
  {
    id: 'v1',
    videoId: 'mock-v1',
    title: '대규모 트래픽에서의 토스 서버 아키텍처',
    url: 'https://youtube.com',
    channel: 'TOSS SLASH',
    thumbnailUrl: '',
    durationSec: 2538, // PT42M18S
    views: 12000,
    publishedAt: '2026-05-28T00:00:00Z',
    topics: ['Backend', '아키텍처'],
    brand: 'oklch(52% 0.19 240)',
  },
  {
    id: 'v2',
    videoId: 'mock-v2',
    title: 'React Server Components 실전 도입기',
    url: 'https://youtube.com',
    channel: 'FECONF',
    thumbnailUrl: '',
    durationSec: 2302, // PT38M22S
    views: 8200,
    publishedAt: '2026-05-27T00:00:00Z',
    topics: ['React', 'RSC'],
    brand: 'oklch(55% 0.20 245)',
  },
  {
    id: 'v3',
    videoId: 'mock-v3',
    title: 'LLM 서빙 비용 80% 줄이기 — vLLM 운영 사례',
    url: 'https://youtube.com',
    channel: 'if(kakao)dev',
    thumbnailUrl: '',
    durationSec: 3064, // PT51M4S
    views: 24000,
    publishedAt: '2026-05-26T00:00:00Z',
    topics: ['AI', 'LLM', 'Infra'],
    brand: 'oklch(60% 0.18 90)',
  },
  {
    id: 'v4',
    videoId: 'mock-v4',
    title: 'PostgreSQL 인덱스 디자인의 함정',
    url: 'https://youtube.com',
    channel: 'DEVIEW',
    thumbnailUrl: '',
    durationSec: 1787, // PT29M47S
    views: 15000,
    publishedAt: '2026-05-25T00:00:00Z',
    topics: ['DB', 'Postgres'],
    brand: 'oklch(55% 0.18 145)',
  },
  {
    id: 'v5',
    videoId: 'mock-v5',
    title: 'Vector DB 직접 만들어보기 — Rust 구현',
    url: 'https://youtube.com',
    channel: 'PyCon Korea',
    thumbnailUrl: '',
    durationSec: 2833, // PT47M13S
    views: 6800,
    publishedAt: '2026-05-24T00:00:00Z',
    topics: ['Rust', 'VectorDB'],
    brand: 'oklch(58% 0.16 230)',
  },
];
