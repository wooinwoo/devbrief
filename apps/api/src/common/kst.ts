// KST(Asia/Seoul) 날짜 경계 헬퍼 — 서버가 UTC 로 돌아도(레일웨이 컨테이너) 일자 집계가 크론(KST)과 일치하도록.
// Date 는 절대 시각(instant)만 다루고, "어느 날짜인가"는 전부 이 모듈을 거친다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 주어진 시각이 속한 KST 달력 날짜의 자정(KST 00:00)을 UTC instant 로 반환 */
export function kstDayStart(at: Date = new Date()): Date {
  const shifted = new Date(at.getTime() + KST_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - KST_OFFSET_MS,
  );
}

/** 주어진 시각의 KST 달력 날짜 라벨 (yyyy-mm-dd) */
export function kstDateLabel(at: Date = new Date()): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
