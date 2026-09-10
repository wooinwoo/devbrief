import { API_BASE } from './api';
import type { RepoDto } from './mock-repos';
import type { VideoDto } from './mock-videos';
import { publicRead } from './public-read';

export async function fetchVideos(limit: number, signal?: AbortSignal): Promise<VideoDto[]> {
  const response = await publicRead(`${API_BASE}/videos?limit=${limit}`, {
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error('Videos unavailable');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid videos');
  return rows.map((row) => {
    if (
      !row ||
      typeof row.id !== 'string' ||
      typeof row.title !== 'string' ||
      typeof row.channel !== 'string' ||
      typeof row.url !== 'string' ||
      typeof row.publishedAt !== 'string' ||
      !Array.isArray(row.topics) ||
      row.topics.some((topic: unknown) => typeof topic !== 'string')
    ) {
      throw new Error('Invalid video');
    }
    return {
      id: row.id,
      videoId: row.videoId,
      title: row.title,
      url: row.url,
      channel: row.channel,
      thumbnailUrl: row.thumbnailUrl,
      durationSec: row.durationSec,
      views: row.views,
      publishedAt: row.publishedAt,
      topics: row.topics,
      brand: row.conference?.brandColor ?? undefined,
    };
  });
}

export async function fetchRepos(signal: AbortSignal) {
  const results = await Promise.allSettled(
    ['weekly', 'daily'].map(async (period) => {
      const response = await publicRead(`${API_BASE}/repos?period=${period}`, {
        cache: 'no-store',
        signal,
      });
      if (!response.ok) throw new Error('Repos unavailable');
      const rows = await response.json();
      if (
        !Array.isArray(rows) ||
        rows.some(
          (row) =>
            !row ||
            typeof row.id !== 'string' ||
            typeof row.fullName !== 'string' ||
            typeof row.name !== 'string' ||
            typeof row.url !== 'string' ||
            row.period !== period,
        )
      ) {
        throw new Error('Invalid repos');
      }
      return rows as RepoDto[];
    }),
  );
  return {
    rows: results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    periods: results.flatMap((result, index) =>
      result.status === 'fulfilled' ? [index === 0 ? 'weekly' : 'daily'] : [],
    ),
    failed: results.some((result) => result.status === 'rejected'),
  };
}
