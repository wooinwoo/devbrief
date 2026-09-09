import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  BENCHMARK_SOURCE_URL,
  parseBenchmarkSnapshot,
} from '../apps/web/src/lib/benchmark-schema.mjs';

function textOf(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) =>
      String.fromCodePoint(
        n[0].toLowerCase() === 'x' ? Number.parseInt(n.slice(1), 16) : Number(n),
      ),
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function metric(text, currency = false) {
  if (text === '--' || text === '—') return null;
  const pattern = currency ? /^\$(\d[\d,]*(?:\.\d+)?)$/ : /^(\d[\d,]*(?:\.\d+)?)$/;
  const match = text.match(pattern);
  if (!match) throw new Error(`Unexpected metric: ${text}`);
  return Number(match[1].replaceAll(',', ''));
}

// Parse only the public, rendered leaderboard table. Never execute page scripts.
export function parseLeaderboard(html, checkedAt = new Date().toISOString()) {
  const versions = [
    ...new Set(
      [...html.matchAll(/Intelligence Index v(\d+\.\d+(?:\.\d+)?)/g)].map((match) => match[1]),
    ),
  ];
  if (versions.length !== 1) throw new Error('Missing or ambiguous Intelligence Index version');
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  const table = tables.find((match) => textOf(match[1]).includes('Cost per Task USD'));
  if (!table) throw new Error('Leaderboard table or cost unit changed');
  const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => cell[1]),
  );
  const headerIndex = rows.findIndex((cells) => textOf(cells[0] ?? '') === 'Model');
  const expected = [
    'Model',
    'Context Window',
    'Creator',
    'Artificial Analysis Intelligence Index',
    'Cost per Task USD',
    'Median Tokens/s',
    'Latency First Chunk (s)',
    'Total Response (s)',
    'Further Analysis',
  ];
  if (
    headerIndex < 0 ||
    JSON.stringify(rows[headerIndex].map(textOf)) !== JSON.stringify(expected)
  ) {
    throw new Error('Leaderboard columns changed; review before publishing');
  }
  const models = [];
  for (const cells of rows.slice(headerIndex + 1)) {
    if (cells.length !== expected.length) throw new Error('Incomplete leaderboard row');
    const values = cells.map(textOf);
    // AA marks incomplete index results with *. Do not present them as full index scores.
    if (values[3].includes('*') || values[3] === '--') continue;
    const slug = cells[8].match(/href="\/models\/([a-z0-9-]+)"/)?.[1];
    if (!slug) throw new Error('Missing model source link');
    models.push({
      name: values[0],
      creator: values[2],
      slug,
      intelligence: metric(values[3]),
      speed: metric(values[5]),
      costPerTask: metric(values[4], true),
    });
  }
  return parseBenchmarkSnapshot({
    schemaVersion: 1,
    sourceUrl: BENCHMARK_SOURCE_URL,
    checkedAt,
    indexVersion: versions[0],
    models,
  });
}

export async function refreshBenchmarks(output, { fetcher = fetch, now = new Date() } = {}) {
  const response = await fetcher(BENCHMARK_SOURCE_URL, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'Devbrief-Benchmark/1.0 (+https://devbrief.pages.dev)' },
  });
  if (!response.ok) throw new Error(`Leaderboard HTTP ${response.status}`);
  // Bound the body even when Content-Length is absent.
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty leaderboard response');
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8_000_000) throw new Error('Leaderboard response too large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const snapshot = parseLeaderboard(Buffer.concat(chunks).toString('utf8'), now.toISOString());
  let previous;
  try {
    previous = parseBenchmarkSnapshot(JSON.parse(await readFile(output, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (previous && snapshot.models.length < previous.models.length * 0.7) {
    throw new Error('Leaderboard unexpectedly lost models; preserving previous snapshot');
  }
  // Publish the date only after the entire response passes validation.
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporary, output);
  return snapshot;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = resolve(process.argv[2] ?? 'apps/web/src/lib/benchmark-snapshot.json');
  const snapshot = await refreshBenchmarks(output);
  console.log(
    `Verified ${snapshot.models.length} models; Intelligence Index v${snapshot.indexVersion}; checked ${snapshot.checkedAt}`,
  );
}
