import { describe, expect, it } from 'vitest';
import { BENCHMARK_MODELS, vendorColor, vendorLabel } from './benchmark-data';

describe('benchmark-data', () => {
  it('vendorLabel — 벤더별 표시명', () => {
    expect(vendorLabel('claude')).toBe('Anthropic');
    expect(vendorLabel('gpt')).toBe('OpenAI');
    expect(vendorLabel('gemini')).toBe('Google');
    expect(vendorLabel('open')).toBe('오픈모델');
  });

  it('vendorColor — 모든 벤더에 oklch 색', () => {
    for (const v of ['claude', 'gpt', 'gemini', 'open'] as const) {
      expect(vendorColor(v)).toMatch(/^oklch\(/);
    }
  });

  it('모델 데이터 무결성 — 필수 필드/타입', () => {
    expect(BENCHMARK_MODELS.length).toBeGreaterThan(0);
    for (const m of BENCHMARK_MODELS) {
      expect(typeof m.name).toBe('string');
      expect(['claude', 'gpt', 'gemini', 'open']).toContain(m.vendor);
      expect(typeof m.intelligence).toBe('number');
      // speed/price/coding은 number 또는 null
      for (const field of [m.speed, m.price, m.coding]) {
        expect(field === null || typeof field === 'number').toBe(true);
      }
    }
  });

  it('모든 벤더는 라벨/색 매핑을 가짐', () => {
    for (const m of BENCHMARK_MODELS) {
      expect(vendorLabel(m.vendor)).toBeTruthy();
      expect(vendorColor(m.vendor)).toBeTruthy();
    }
  });
});
