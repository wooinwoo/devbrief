import { rgbToOklch } from './brand-color.service';

describe('rgbToOklch', () => {
  it('순수 빨강 (255, 0, 0)', () => {
    const result = rgbToOklch(255, 0, 0);
    expect(result).toMatch(/^oklch\(\d+% [\d.]+ \d+\)$/);
    // OKLab 기준 빨강은 hue ~29
    const match = /oklch\((\d+)% ([\d.]+) (\d+)\)/.exec(result)!;
    const [, l, c, h] = match;
    expect(Number(l)).toBeGreaterThan(50);
    expect(Number(l)).toBeLessThan(70);
    expect(Number(c)).toBeGreaterThan(0.2);
    expect(Number(h)).toBeGreaterThan(20);
    expect(Number(h)).toBeLessThan(40);
  });

  it('순수 초록 (0, 255, 0) — hue 약 142°', () => {
    const result = rgbToOklch(0, 255, 0);
    const h = Number(/oklch\(\d+% [\d.]+ (\d+)\)/.exec(result)![1]);
    expect(h).toBeGreaterThan(130);
    expect(h).toBeLessThan(160);
  });

  it('순수 파랑 (0, 0, 255) — hue 약 264°', () => {
    const result = rgbToOklch(0, 0, 255);
    const h = Number(/oklch\(\d+% [\d.]+ (\d+)\)/.exec(result)![1]);
    expect(h).toBeGreaterThan(250);
    expect(h).toBeLessThan(280);
  });

  it('회색 (128, 128, 128) — chroma가 작아도 floor 적용', () => {
    const result = rgbToOklch(128, 128, 128);
    const c = Number(/oklch\(\d+% ([\d.]+) \d+\)/.exec(result)![1]);
    expect(c).toBeGreaterThanOrEqual(0.05);
  });

  it('검정 (0, 0, 0)', () => {
    const result = rgbToOklch(0, 0, 0);
    const l = Number(/oklch\((\d+)%/.exec(result)![1]);
    expect(l).toBe(0);
  });

  it('흰색 (255, 255, 255)', () => {
    const result = rgbToOklch(255, 255, 255);
    const l = Number(/oklch\((\d+)%/.exec(result)![1]);
    expect(l).toBe(100);
  });

  it('항상 CSS oklch() 유효 문자열 반환', () => {
    const samples: Array<[number, number, number]> = [
      [10, 20, 30],
      [200, 50, 100],
      [50, 200, 50],
      [255, 200, 0],
    ];
    for (const [r, g, b] of samples) {
      const result = rgbToOklch(r, g, b);
      expect(result).toMatch(/^oklch\(\d+% [\d.]+ \d+\)$/);
    }
  });
});
