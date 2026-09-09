import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_SNAPSHOT,
  isBenchmarkStale,
  parseBenchmarkSnapshot,
  selectBenchmarkModels,
} from './benchmark-data';

describe('benchmark snapshots', () => {
  it('ships sourced measurements with an explicit evaluation version', () => {
    const snapshot = parseBenchmarkSnapshot(BENCHMARK_SNAPSHOT);
    expect(snapshot.models.length).toBeGreaterThan(50);
    expect(snapshot.indexVersion).toBe('4.3');
    expect(snapshot.models.some((model) => model.name === 'GPT-6 Astra (max)')).toBe(true);
    expect(snapshot.models.every((model) => !('coding' in model) && !('price' in model))).toBe(
      true,
    );
  });
  it.each([
    { schemaVersion: 2 },
    { indexVersion: '' },
    { sourceUrl: 'https://untrusted.example' },
    { checkedAt: 'invalid' },
    { checkedAt: '2099-01-01T00:00:00Z' },
    { models: [] },
  ])('rejects incompatible feeds: %j', (change) => {
    expect(() => parseBenchmarkSnapshot({ ...BENCHMARK_SNAPSHOT, ...change })).toThrow();
  });
  it('rejects duplicated, malformed and non-finite measurements', () => {
    const models = BENCHMARK_SNAPSHOT.models;
    for (const change of [
      { speed: -1 },
      { costPerTask: Number.NaN },
      { intelligence: 101 },
      { slug: '../redirect' },
      { name: '' },
      { creator: null },
    ]) {
      expect(() =>
        parseBenchmarkSnapshot({
          ...BENCHMARK_SNAPSHOT,
          models: [{ ...models[0], ...change }, ...models.slice(1)],
        }),
      ).toThrow();
    }
    expect(() =>
      parseBenchmarkSnapshot({ ...BENCHMARK_SNAPSHOT, models: [...models, models[0]] }),
    ).toThrow();
  });
  it('sorts by the selected metric, finds creators and leaves source data intact', () => {
    const models = [
      {
        ...BENCHMARK_SNAPSHOT.models[0],
        name: 'Alpha',
        creator: 'Lab',
        intelligence: 40,
        speed: 200,
        costPerTask: 2,
      },
      {
        ...BENCHMARK_SNAPSHOT.models[1],
        name: 'Beta',
        creator: 'Other',
        intelligence: 50,
        speed: 100,
        costPerTask: 1,
      },
      {
        ...BENCHMARK_SNAPSHOT.models[2],
        name: 'Gamma',
        creator: 'Lab',
        intelligence: 30,
        speed: null,
        costPerTask: null,
      },
    ];
    expect(selectBenchmarkModels(models, 'intelligence', '')[0].name).toBe('Beta');
    expect(selectBenchmarkModels(models, 'speed', '')[0].name).toBe('Alpha');
    expect(selectBenchmarkModels(models, 'costPerTask', '').map((model) => model.name)).toEqual([
      'Beta',
      'Alpha',
    ]);
    expect(
      selectBenchmarkModels(models, 'intelligence', ' LAB ').map((model) => model.name),
    ).toEqual(['Alpha', 'Gamma']);
    expect(models[0].name).toBe('Alpha');
  });
  it('flags old data without relabeling its date as today', () => {
    const checked = '2026-09-09T00:00:00Z';
    expect(isBenchmarkStale(checked, Date.parse('2026-09-11T00:00:00Z'))).toBe(false);
    expect(isBenchmarkStale(checked, Date.parse('2026-09-13T00:00:00Z'))).toBe(true);
  });
});
