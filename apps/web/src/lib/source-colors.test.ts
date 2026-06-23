import { describe, expect, it } from 'vitest';
import { SOURCE_DOT, sourceColor } from './source-colors';

describe('sourceColor', () => {
  it('알려진 provider는 매핑된 색 반환', () => {
    expect(sourceColor('hackernews')).toBe(SOURCE_DOT.hackernews);
    expect(sourceColor('toss_tech')).toBe(SOURCE_DOT.toss_tech);
    expect(sourceColor('mdn')).toBe(SOURCE_DOT.mdn);
  });

  it('미등록 provider는 rss_generic fallback', () => {
    expect(sourceColor('unknown-source')).toBe(SOURCE_DOT.rss_generic);
    expect(sourceColor('')).toBe(SOURCE_DOT.rss_generic);
  });

  it('대소문자 구분 — 정확히 일치해야 함', () => {
    // 키는 소문자, 대문자로 넘기면 fallback
    expect(sourceColor('HackerNews')).toBe(SOURCE_DOT.rss_generic);
  });

  it('모든 SOURCE_DOT 값은 유효한 oklch 문자열', () => {
    for (const color of Object.values(SOURCE_DOT)) {
      expect(color).toMatch(/^oklch\(/);
    }
  });
});
