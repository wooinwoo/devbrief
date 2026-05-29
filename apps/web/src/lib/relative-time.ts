export function relativeTime(iso: string): string {
  const now = Date.now();
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
  });
}
