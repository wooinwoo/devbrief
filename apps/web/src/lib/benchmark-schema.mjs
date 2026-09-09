export const BENCHMARK_SOURCE_URL = 'https://artificialanalysis.ai/leaderboards/models';
export const BENCHMARK_FEED_URL =
  'https://raw.githubusercontent.com/wooinwoo/devbrief/benchmark-data/llm-benchmarks.json';

/**
 * @typedef {{name: string, creator: string, slug: string, intelligence: number,
 * speed: number|null, costPerTask: number|null}} BenchModel
 * @typedef {{schemaVersion: 1, sourceUrl: string, checkedAt: string,
 * indexVersion: string, models: BenchModel[]}} BenchmarkSnapshot
 */

/** Reject incompatible/partial feeds before they can replace a working snapshot.
 * @param {unknown} value
 * @param {number} [now]
 * @returns {BenchmarkSnapshot}
 */
export function parseBenchmarkSnapshot(value, now = Date.now()) {
  const snapshot = /** @type {BenchmarkSnapshot} */ (value);
  if (
    !snapshot ||
    snapshot.schemaVersion !== 1 ||
    snapshot.sourceUrl !== BENCHMARK_SOURCE_URL ||
    typeof snapshot.indexVersion !== 'string' ||
    !/^\d+\.\d+(?:\.\d+)?$/.test(snapshot.indexVersion) ||
    typeof snapshot.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(snapshot.checkedAt)) ||
    Date.parse(snapshot.checkedAt) > now + 300_000 ||
    !Array.isArray(snapshot.models) ||
    snapshot.models.length < 10 ||
    snapshot.models.length > 1000
  )
    throw new Error('Invalid benchmark snapshot');

  const slugs = new Set();
  for (const model of snapshot.models) {
    if (
      !model ||
      typeof model.name !== 'string' ||
      !model.name.trim() ||
      model.name.length > 200 ||
      typeof model.creator !== 'string' ||
      !model.creator.trim() ||
      model.creator.length > 100 ||
      typeof model.slug !== 'string' ||
      !/^[a-z0-9][a-z0-9-]{0,199}$/.test(model.slug) ||
      slugs.has(model.slug) ||
      !Number.isFinite(model.intelligence) ||
      model.intelligence < 0 ||
      model.intelligence > 100 ||
      !validOptionalMetric(model.speed) ||
      !validOptionalMetric(model.costPerTask)
    )
      throw new Error('Invalid benchmark model');
    slugs.add(model.slug);
  }
  return snapshot;
}

/** @param {unknown} value */
function validOptionalMetric(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

/** @param {string} checkedAt @param {number} [now] */
export function isBenchmarkStale(checkedAt, now = Date.now()) {
  return now - Date.parse(checkedAt) > 3 * 86_400_000;
}
