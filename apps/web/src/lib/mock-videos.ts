export interface VideoDto {
  id: string;
  title: string;
  url: string;
  channel: string;
  thumbnail: string; // 실제 운영 시 i.ytimg.com/vi/{id}/maxresdefault.jpg
  duration: string;
  views: string;
  publishedAt: string;
  topics: string[];
  brand?: string; // 채널/컨퍼런스 brand 색 (thumbnail 없을 때 fallback)
}

// 컨퍼런스 발표 영상 mock. thumbnail은 실제 YouTube Data API 동기화 전까지
// 비워두고 컴포넌트에서 brand 색 + 큰 duration 으로 fallback.
export const MOCK_VIDEOS: VideoDto[] = [
  {
    id: 'v1',
    title: '대규모 트래픽에서의 토스 서버 아키텍처',
    url: 'https://youtube.com',
    channel: 'TOSS SLASH',
    thumbnail: '',
    duration: '42:18',
    views: '12K',
    publishedAt: '2026-05-28T00:00:00Z',
    topics: ['Backend', '아키텍처'],
    brand: 'oklch(52% 0.19 240)',
  },
  {
    id: 'v2',
    title: 'React Server Components 실전 도입기',
    url: 'https://youtube.com',
    channel: 'FECONF',
    thumbnail: '',
    duration: '38:22',
    views: '8.2K',
    publishedAt: '2026-05-27T00:00:00Z',
    topics: ['React', 'RSC'],
    brand: 'oklch(55% 0.20 245)',
  },
  {
    id: 'v3',
    title: 'LLM 서빙 비용 80% 줄이기 — vLLM 운영 사례',
    url: 'https://youtube.com',
    channel: 'if(kakao)dev',
    thumbnail: '',
    duration: '51:04',
    views: '24K',
    publishedAt: '2026-05-26T00:00:00Z',
    topics: ['AI', 'LLM', 'Infra'],
    brand: 'oklch(60% 0.18 90)',
  },
  {
    id: 'v4',
    title: 'PostgreSQL 인덱스 디자인의 함정',
    url: 'https://youtube.com',
    channel: 'DEVIEW',
    thumbnail: '',
    duration: '29:47',
    views: '15K',
    publishedAt: '2026-05-25T00:00:00Z',
    topics: ['DB', 'Postgres'],
    brand: 'oklch(55% 0.18 145)',
  },
  {
    id: 'v5',
    title: 'Vector DB 직접 만들어보기 — Rust 구현',
    url: 'https://youtube.com',
    channel: 'PyCon Korea',
    thumbnail: '',
    duration: '47:13',
    views: '6.8K',
    publishedAt: '2026-05-24T00:00:00Z',
    topics: ['Rust', 'VectorDB'],
    brand: 'oklch(58% 0.16 230)',
  },
];
