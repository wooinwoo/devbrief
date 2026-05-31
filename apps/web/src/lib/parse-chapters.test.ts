import { describe, it, expect } from 'vitest';
import { parseChapters, parseTimestamp } from './parse-chapters';

describe('parseTimestamp', () => {
  it('M:SS', () => {
    expect(parseTimestamp('1:00')).toBe(60);
    expect(parseTimestamp('12:34')).toBe(754);
    expect(parseTimestamp('0:42')).toBe(42);
  });

  it('H:MM:SS', () => {
    expect(parseTimestamp('1:00:00')).toBe(3600);
    expect(parseTimestamp('1:23:45')).toBe(5025);
  });

  it('잘못된 입력 → null', () => {
    expect(parseTimestamp('abc')).toBeNull();
    expect(parseTimestamp('1:2:3:4')).toBeNull();
  });
});

describe('parseChapters', () => {
  it('표준 형식 — 줄 시작 M:SS + 라벨', () => {
    const desc = `
00:00 인트로
01:35 토스 트래픽 규모
07:42 인프라 아키텍처
23:14 장애 대응 사례
42:18 Q&A 및 마무리
    `.trim();
    const chapters = parseChapters(desc);
    expect(chapters).toEqual([
      { time: 0, label: '인트로' },
      { time: 95, label: '토스 트래픽 규모' },
      { time: 462, label: '인프라 아키텍처' },
      { time: 1394, label: '장애 대응 사례' },
      { time: 2538, label: 'Q&A 및 마무리' },
    ]);
  });

  it('H:MM:SS 형식도 매치', () => {
    const desc = `0:00 시작\n1:23:45 후반부`;
    const chapters = parseChapters(desc);
    expect(chapters).toHaveLength(2);
    expect(chapters[1]).toEqual({ time: 5025, label: '후반부' });
  });

  it('대괄호 / 하이픈 / 콜론 구분자 허용', () => {
    const desc = `
[00:00] - 인트로
- 12:30 본론
(23:45): 마무리
    `.trim();
    const chapters = parseChapters(desc);
    expect(chapters).toHaveLength(3);
    expect(chapters[0].label).toBe('인트로');
    expect(chapters[1].label).toBe('본론');
    expect(chapters[2].label).toBe('마무리');
  });

  it('timestamp 없는 줄은 무시', () => {
    const desc = `
이 발표에서는 다음을 다룹니다.
00:00 인트로
구독해주세요
05:30 본론
http://example.com
    `.trim();
    const chapters = parseChapters(desc);
    expect(chapters).toHaveLength(2);
  });

  it('빈 description 또는 null → 빈 배열', () => {
    expect(parseChapters('')).toEqual([]);
    expect(parseChapters(null)).toEqual([]);
    expect(parseChapters(undefined)).toEqual([]);
  });

  it('chapters 없음 → 빈 배열', () => {
    expect(parseChapters('이 발표는 좋은 발표입니다.')).toEqual([]);
  });

  it('durationSec 초과하는 timestamp 는 제거', () => {
    const desc = `0:00 시작\n1:00 본론\n10:00 ?(잘못된 chapter)`;
    const chapters = parseChapters(desc, 300); // 5분
    expect(chapters.map((c) => c.label)).toEqual(['시작', '본론']);
  });

  it('중복 time 제거', () => {
    const desc = `0:00 A\n0:00 B\n1:00 C`;
    const chapters = parseChapters(desc);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].label).toBe('A');
  });

  it('time 오름차순 정렬', () => {
    const desc = `5:00 C\n0:00 A\n2:30 B`;
    const chapters = parseChapters(desc);
    expect(chapters.map((c) => c.label)).toEqual(['A', 'B', 'C']);
  });
});
