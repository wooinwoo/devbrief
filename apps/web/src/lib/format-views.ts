/** 조회수 표기: 18 → "18", 1,234 → "1.2K", 45,600 → "46K" */
export function formatViews(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
