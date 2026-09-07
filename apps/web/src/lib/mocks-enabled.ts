// mock 폴백 게이트 — 개발 환경(또는 NEXT_PUBLIC_ENABLE_MOCKS=1 명시 opt-in)에서만 켜진다.
// 프로덕션에서는 API 실패/빈 응답 시 mock 대신 진짜 빈 상태 UI 를 렌더해야 한다.
// (mock 데이터는 조작된 날짜/조회수/star 수치라 운영 노출 시 실데이터로 오인된다)
export const MOCKS_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_MOCKS === '1';
