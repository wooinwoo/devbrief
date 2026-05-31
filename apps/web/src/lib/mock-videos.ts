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
  description?: string | null; // YouTube snippet.description (chapters 파싱용)
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
    description: `일평균 5000만 건 트랜잭션을 처리하는 토스의 서버 아키텍처를 공유합니다.

00:00 인트로 — 발표 개요
01:35 토스 트래픽 규모와 성장 추이
07:42 인프라 아키텍처 한눈에 보기
14:20 결제 도메인 — Saga 패턴 도입기
22:55 장애 대응 — CircuitBreaker / Bulkhead
31:10 카오스 엔지니어링 사례
38:00 운영 모니터링 스택
42:00 Q&A 마무리`,
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
    description: `Next 15 RSC 를 실제 프로덕션에 도입한 후 1년간의 경험을 공유합니다.

00:00 인트로
02:12 왜 RSC 인가
08:45 서버/클라이언트 컴포넌트 경계 설계
15:30 데이터 fetch 전략 — Suspense / use()
24:18 SEO 와 캐싱 — revalidate / no-store
31:00 우리가 실패한 것들
36:50 마치며`,
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
    description: `vLLM 으로 LLM 서빙 비용 80% 절감한 운영 경험을 공유합니다.

00:00 인트로
03:00 카카오의 LLM 사용량 — 일 1억 요청
09:30 vLLM 도입 배경 — KV cache 의 한계
17:42 PagedAttention 동작 원리
26:15 멀티 GPU 스케줄링 — pipeline / tensor parallel
35:48 양자화 (INT4) 적용 후 성능 비교
44:00 운영 안정화 — 트래픽 burst 대응
50:00 Q&A`,
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
    description: `PostgreSQL 인덱스 디자인에서 자주 빠지는 함정 5가지를 사례 중심으로.

00:00 인트로
01:50 B-tree 인덱스 동작 복습
06:30 함정 1 — Selectivity 가 낮으면 안 탐
11:15 함정 2 — Multi-column 순서가 잘못된 경우
17:00 함정 3 — Partial index 미사용
22:30 함정 4 — BRIN vs B-tree 오용
28:00 함정 5 — Index bloat 무시
29:30 정리`,
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
    description: `Rust 로 Vector DB 를 직접 구현하며 배운 것들을 공유합니다.

00:00 인트로
02:45 왜 Rust 인가
09:20 IVF 인덱스 구조 살펴보기
16:00 HNSW 그래프 알고리즘 구현
26:30 SIMD 로 거리 계산 가속
35:14 디스크 / mmap 기반 저장
43:00 pgvector 와 벤치마크 비교
46:30 Q&A`,
  },
];
