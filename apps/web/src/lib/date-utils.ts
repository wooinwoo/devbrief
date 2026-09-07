const DAY_MS = 24 * 60 * 60 * 1000;

// 오늘 날짜(yyyy-mm-dd)를 KST 고정으로 뽑는 포맷터 — 서버(UTC)/클라(KST) 어디서 실행돼도 동일
const KST_DAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });

/** 여러 날 열리는 행사는 마지막 날까지 일정 목록에 남긴다. */
export function isUpcomingEvent(event: { startDate: string; endDate?: string | null }): boolean {
  return daysUntil(event.endDate ?? event.startDate) >= 0;
}

/**
 * ISO 날짜까지 남은 일수 — 시각이 아닌 KST 달력 날짜 비교. 음수면 지난 날짜.
 * 서버는 date-only 문자열을 UTC 자정('2026-10-25T00:00:00.000Z')으로 저장하므로
 * 앞 10자(달력 날짜)만 파싱한다. 시각 비교(ceil) 방식은 KST 에서 항상 +1 이 되는 버그가 있었다.
 */
export function daysUntil(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const [ty, tm, td] = KST_DAY_FMT.format(new Date()).split('-').map(Number);
  const today = Date.UTC(ty, tm - 1, td);
  return Math.round((target - today) / DAY_MS);
}

/**
 * 다음 수집 시각(매일 09:00 KST)까지 남은 시간 라벨.
 * KST 는 DST 가 없어 09:00 KST == 00:00 UTC 고정이므로 UTC 산술만으로
 * 서버/클라 어디서든 같은 값이 나온다(hydration 불일치 없음).
 */
export function nextNineAmLabel(now: Date = new Date()): string {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0); // 다음 00:00 UTC = 다음 09:00 KST
  const diffH = Math.round((next.getTime() - now.getTime()) / (1000 * 60 * 60));
  if (diffH < 1) return '곧';
  if (diffH < 24) return `${diffH}시간 뒤`;
  return '내일 오전 9시';
}
