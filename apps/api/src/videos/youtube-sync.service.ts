import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

interface YtSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    description?: string;
    thumbnails: {
      maxres?: { url: string };
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

interface YtVideoDetail {
  id: string;
  contentDetails: { duration: string }; // ISO 8601 PT42M18S
  statistics?: { viewCount?: string };
  snippet?: { description?: string };
}

@Injectable()
export class YouTubeSyncService {
  private readonly logger = new Logger(YouTubeSyncService.name);
  private readonly apiKey: string;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = config.get<string>('YOUTUBE_API_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'YOUTUBE_API_KEY 미설정. /videos는 manual seed에만 의존.',
      );
    }
  }

  /**
   * 등록된 컨퍼런스 중 youtubeChannelId 있는 것 전부 동기화.
   * 채널의 최근 영상 N개를 가져와 Video upsert.
   */
  async syncAllConferences(perChannel = 10): Promise<{ synced: number }> {
    if (!this.apiKey) {
      this.logger.warn('YOUTUBE_API_KEY 없음 → 동기화 skip');
      return { synced: 0 };
    }
    const confs = await this.prisma.conference.findMany({
      where: { youtubeChannelId: { not: null } },
    });
    let total = 0;
    for (const c of confs) {
      try {
        const count = await this.syncChannel(c.id, c.youtubeChannelId!, perChannel);
        total += count;
        this.logger.log(`[${c.name}] +${count} videos`);
      } catch (e) {
        this.logger.error(`[${c.name}] sync 실패: ${(e as Error).message}`);
      }
    }
    return { synced: total };
  }

  async syncChannel(
    conferenceId: string,
    channelId: string,
    maxResults: number,
  ): Promise<number> {
    // 1) search.list — 채널 최근 영상 videoId 추출
    const searchRes = await axios.get<{ items: YtSearchItem[] }>(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          key: this.apiKey,
          channelId,
          part: 'snippet',
          order: 'date',
          type: 'video',
          maxResults,
        },
      },
    );
    const items = searchRes.data.items ?? [];
    if (items.length === 0) return 0;

    // 2) videos.list — duration / views 보강
    const ids = items.map((i) => i.id.videoId).join(',');
    const detailRes = await axios.get<{ items: YtVideoDetail[] }>(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          key: this.apiKey,
          id: ids,
          // snippet 추가 — videos.list 의 snippet.description 은 풀 description
          // (search.list 의 snippet.description 은 ~160자 truncated)
          part: 'contentDetails,statistics,snippet',
        },
      },
    );
    const detailMap = new Map(detailRes.data.items.map((d) => [d.id, d]));

    let count = 0;
    for (const it of items) {
      const detail = detailMap.get(it.id.videoId);
      if (!detail) continue;
      const thumb =
        it.snippet.thumbnails.maxres?.url ??
        it.snippet.thumbnails.high?.url ??
        it.snippet.thumbnails.medium?.url ??
        it.snippet.thumbnails.default?.url ??
        '';
      await this.prisma.video.upsert({
        where: { videoId: it.id.videoId },
        create: {
          videoId: it.id.videoId,
          title: it.snippet.title,
          url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
          channel: it.snippet.channelTitle,
          thumbnailUrl: thumb,
          durationSec: parseIsoDuration(detail.contentDetails.duration),
          views: Number(detail.statistics?.viewCount ?? 0),
          publishedAt: new Date(it.snippet.publishedAt),
          description:
            detail.snippet?.description ?? it.snippet.description ?? null,
          conferenceId,
        },
        update: {
          title: it.snippet.title,
          description:
            detail.snippet?.description ?? it.snippet.description ?? null,
          thumbnailUrl: thumb,
          views: Number(detail.statistics?.viewCount ?? 0),
        },
      });
      count++;
    }
    return count;
  }
}

/** PT42M18S / PT1H2M3S → 초 */
export function parseIsoDuration(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  return h * 3600 + min * 60 + s;
}
