export interface Chapter {
  time: number; // 초 단위
  label: string;
}

/**
 * YouTube description 에서 chapters 추출.
 * 패턴: 각 줄이 `0:00`, `12:34`, `1:23:45` 같은 timestamp 로 시작.
 * 첫 chapter time 은 0 이어야 YouTube 가 인정하는데, 우리는 관대하게 허용.
 *
 * 예시 ─ YouTube TOSS SLASH 발표 description:
 *   00:00 인트로
 *   01:35 토스 트래픽 규모
 *   07:42 인프라 아키텍처
 *   23:14 장애 대응 사례
 *   42:18 Q&A 및 마무리
 */
export function parseChapters(
  description: string | null | undefined,
  durationSec?: number,
): Chapter[] {
  if (!description) return [];

  const lines = description.split('\n');
  const out: Chapter[] = [];

  // 줄 시작 timestamp (앞에 공백, [, - 허용) — 12:34 or 1:23:45
  const RE = /^[\s\[\-(]*((?:\d{1,2}:)?\d{1,2}:\d{2})[\s\)\]\-:.|]*(.+)$/;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = RE.exec(line);
    if (!m) continue;
    const time = parseTimestamp(m[1]);
    if (time === null) continue;
    if (durationSec && time > durationSec) continue;
    const label = m[2].trim().replace(/[\s\-—–|·:]+$/g, '');
    if (!label) continue;
    out.push({ time, label });
  }

  // 같은 time 중복 제거 + 시간 오름차순 보장
  const seen = new Set<number>();
  return out
    .filter((c) => {
      if (seen.has(c.time)) return false;
      seen.add(c.time);
      return true;
    })
    .sort((a, b) => a.time - b.time);
}

/** "12:34" → 754, "1:23:45" → 5025 */
export function parseTimestamp(ts: string): number | null {
  const parts = ts.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
