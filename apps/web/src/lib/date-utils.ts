/** ISO 날짜까지 남은 일수 (오늘 0시 기준). 음수면 지난 날짜. */
export function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
}
