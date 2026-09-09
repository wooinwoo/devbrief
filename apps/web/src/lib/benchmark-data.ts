import {
  type BenchModel,
  type BenchmarkSnapshot,
  parseBenchmarkSnapshot,
} from './benchmark-schema.mjs';
import snapshot from './benchmark-snapshot.json';

export type { BenchmarkSnapshot, BenchModel };
export {
  BENCHMARK_FEED_URL,
  isBenchmarkStale,
  parseBenchmarkSnapshot,
} from './benchmark-schema.mjs';
export const BENCHMARK_SNAPSHOT = parseBenchmarkSnapshot(snapshot, Date.parse(snapshot.checkedAt));

export type BenchmarkMetric = 'intelligence' | 'speed' | 'costPerTask';

export function selectBenchmarkModels(
  models: BenchModel[],
  metric: BenchmarkMetric,
  query: string,
): BenchModel[] {
  const term = query.trim().toLocaleLowerCase();
  return models
    .filter(
      (model) =>
        model[metric] !== null &&
        `${model.name} ${model.creator}`.toLocaleLowerCase().includes(term),
    )
    .sort((a, b) => {
      const difference = (a[metric] ?? 0) - (b[metric] ?? 0);
      return (
        (metric === 'costPerTask' ? difference : -difference) ||
        b.intelligence - a.intelligence ||
        a.name.localeCompare(b.name, 'en')
      );
    });
}

export function vendorColor(creator: string): string {
  const colors: Record<string, string> = {
    Anthropic: 'oklch(58% 0.16 60)',
    OpenAI: 'oklch(52% 0.13 165)',
    Google: 'oklch(54% 0.17 250)',
  };
  return colors[creator] ?? 'var(--color-fg-muted)';
}
