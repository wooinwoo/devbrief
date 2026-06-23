// API 베이스 URL — 배포 시 NEXT_PUBLIC_API_BASE 로 교체. 로컬 기본값 fallback.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';
