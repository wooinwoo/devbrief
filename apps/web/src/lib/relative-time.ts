/**
 * 발행 시각의 상대시간 라벨. now 는 테스트/고정 기준 시각 주입용(기본 현재 시각).
 * 30일 초과 폴백은 KST 고정 — 서버(UTC)/클라(KST) 어디서 렌더돼도 같은 날짜가 나온다.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = now - then;

  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hour = Math.round(min / 60);
  const day = Math.round(hour / 24);

  if (sec < 60) return '방금';
  if (min < 60) return `${min}분 전`;
  if (hour < 24) return `${hour}시간 전`;
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.round(day / 7)}주 전`;
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  });
}
