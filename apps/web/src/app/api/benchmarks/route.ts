import {
  BENCHMARK_FEED_URL,
  BENCHMARK_SNAPSHOT,
  parseBenchmarkSnapshot,
} from '@/lib/benchmark-data';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const upstream = await fetch(BENCHMARK_FEED_URL, {
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(4_000),
      headers: { accept: 'application/json' },
    });
    if (!upstream.ok) throw new Error(`Benchmark feed HTTP ${upstream.status}`);
    const body = await upstream.text();
    if (body.length > 512_000) throw new Error('Benchmark feed too large');
    const next = parseBenchmarkSnapshot(JSON.parse(body));
    if (Date.parse(next.checkedAt) < Date.parse(BENCHMARK_SNAPSHOT.checkedAt)) {
      throw new Error('Benchmark feed is older than bundled data');
    }
    return Response.json(next, {
      headers: { 'cache-control': 'public, max-age=300, s-maxage=300' },
    });
  } catch (error) {
    console.warn(
      'Benchmark feed refresh failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    // A temporary upstream outage must never erase data or advance its date.
    return Response.json(BENCHMARK_SNAPSHOT, {
      headers: { 'cache-control': 'public, max-age=30, s-maxage=30' },
    });
  }
}
