import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
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
  // 소켓 행 시 주간 크론/CLI 가 무한 대기하지 않게 공용 타임아웃 인스턴스 (레포 관례 github-trending 15s)
  private readonly http = axios.create({ timeout: 15_000 });

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = config.get<string>('YOUTUBE_API_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.log('YOUTUBE_API_KEY 미설정: 공식 채널 공개 RSS로 동기화합니다.');
    }
  }

  /**
   * 등록된 컨퍼런스 중 youtubeChannelId 있는 것 전부 동기화.
   * 채널의 최근 영상 N개를 가져와 Video upsert.
   */
  async syncAllConferences(perChannel = 15): Promise<{ synced: number; failed: number }> {
    const confs = await this.prisma.conference.findMany({
      where: { youtubeChannelId: { not: null } },
    });
    // These IDs were verified against each publisher's official site on 2026-09-07.
    // A former seed used two nonexistent IDs and the unrelated Make: channel.
    const channels = new Map(
      VERIFIED_CHANNELS.map((c) => [c.channelId, { ...c, id: null as string | null }]),
    );
    for (const c of confs) {
      if (!c.youtubeChannelId || INVALID_SEED_CHANNELS.has(c.youtubeChannelId)) continue;
      if (!channels.has(c.youtubeChannelId))
        channels.set(c.youtubeChannelId, { channelId: c.youtubeChannelId, name: c.name, id: c.id });
    }
    let failed = 0;
    let total = 0;
    for (const c of channels.values()) {
      try {
        const count =
          this.apiKey && c.id
            ? await this.syncChannel(c.id, c.channelId, perChannel)
            : await this.syncPublicFeed(c.channelId, perChannel);
        total += count;
        this.logger.log(`[${c.name}] +${count} videos`);
      } catch (e) {
        failed++;
        this.logger.error(`[${c.name}] sync 실패: ${(e as Error).message}`);
      }
    }
    return { synced: total, failed };
  }

  /** Official public feeds expose recent metadata without an API key.
   * Existing duration, analysis and manually assigned conference are preserved.
   * A channel's old talks must not be attributed to its upcoming conference.
   */
  async syncPublicFeed(channelId: string, limit: number): Promise<number> {
    if (!/^UC[A-Za-z0-9_-]{22}$/.test(channelId)) throw new Error('Invalid channel ID');
    const { data } = await this.http.get<string>('https://www.youtube.com/feeds/videos.xml', {
      params: { channel_id: channelId },
      responseType: 'text',
      maxContentLength: 2_000_000,
    });
    const rows = parseVideoFeed(data, channelId)
      .filter(
        (row) =>
          channelId !== 'UCeg5g-vWgtgzQ0cYNV2Cyow' ||
          /SLASH|모닥불|프론트엔드|개발자/i.test(row.title),
      )
      .slice(0, Math.min(limit, 15));
    for (const row of rows) {
      await this.prisma.video.upsert({
        where: { videoId: row.videoId },
        create: { ...row, durationSec: 0 },
        update: {
          title: row.title,
          description: row.description,
          thumbnailUrl: row.thumbnailUrl,
          views: row.views,
        },
      });
    }
    return rows.length;
  }

  async syncChannel(conferenceId: string, channelId: string, maxResults: number): Promise<number> {
    // 1) search.list — 채널 최근 영상 videoId 추출
    const searchRes = await this.http.get<{ items: YtSearchItem[] }>(
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
    const items = searchRes.data?.items ?? [];
    if (items.length === 0) return 0;

    // 2) videos.list — duration / views 보강
    const ids = items.map((i) => i.id.videoId).join(',');
    const detailRes = await this.http.get<{ items: YtVideoDetail[] }>(
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
    const detailItems = detailRes.data?.items ?? [];
    const detailMap = new Map(detailItems.map((d) => [d.id, d]));

    let count = 0;
    let firstThumb: string | null = null;
    for (const it of items) {
      const detail = detailMap.get(it.id.videoId);
      if (!detail) continue;
      const thumb =
        it.snippet.thumbnails.maxres?.url ??
        it.snippet.thumbnails.high?.url ??
        it.snippet.thumbnails.medium?.url ??
        it.snippet.thumbnails.default?.url ??
        '';
      if (!firstThumb && thumb) firstThumb = thumb;
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
          description: detail.snippet?.description ?? it.snippet.description ?? null,
          conferenceId,
        },
        update: {
          title: it.snippet.title,
          description: detail.snippet?.description ?? it.snippet.description ?? null,
          thumbnailUrl: thumb,
          views: Number(detail.statistics?.viewCount ?? 0),
        },
      });
      count++;
    }
    // 수동 추가(/videos/add)로 conferenceId 없이 먼저 저장된 영상을 이 컨퍼런스에 연결.
    // upsert 의 update 분기는 conferenceId 를 덮지 않으므로(수동 교정 보호) null 인 것만 일괄 채움.
    await this.prisma.video.updateMany({
      where: {
        videoId: { in: items.map((i) => i.id.videoId) },
        conferenceId: null,
      },
      data: { conferenceId },
    });
    // 컨퍼런스 대표 이미지가 없으면 첫 발표 영상 썸네일로 채움
    // (공식 사이트 og:image가 죽은 경우 — FECONF/SLASH 등)
    if (firstThumb) {
      await this.prisma.conference.updateMany({
        where: { id: conferenceId, imageUrl: null },
        data: { imageUrl: firstThumb },
      });
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

export const INVALID_SEED_CHANNELS = new Set([
  'UCwLzlvJa4_LfHbcLbo0e7DA',
  'UChtY6O8Ahw2cz05PS2GhUbg',
  'UCvCikG-AvVl1nDjsdJ4w0pA',
]);
const VERIFIED_CHANNELS = [
  // https://2020.feconf.kr/ -> official YouTube channel
  { name: 'FEConf Korea', channelId: 'UCWEzfYIpFBIG5jh6laXC6hA' },
  // https://d2.naver.com/news/2884147 -> @naver_d2
  { name: 'NAVER D2', channelId: 'UCNrehnUq7Il-J7HQxrzp7CA' },
  // https://tech.kakao.com/blog -> @kakaotech
  { name: 'kakao tech', channelId: 'UCdQF7F6hwjSpulj_fwB9iDQ' },
];

export function parseVideoFeed(xml: string, channelId: string) {
  const $ = cheerio.load(xml, { xml: true });
  const feedChannelId = $('feed > yt\\:channelId').text().trim();
  // YouTube's feed-level ID omits UC; entry-level IDs retain it.
  if (feedChannelId !== channelId && `UC${feedChannelId}` !== channelId)
    throw new Error('Video feed channel mismatch');
  const channel = $('feed > author > name').first().text().trim();
  if (!channel) throw new Error('Video feed has no publisher');
  return $('entry')
    .toArray()
    .flatMap((el) => {
      const entry = $(el);
      const videoId = entry.find('yt\\:videoId').text().trim();
      const title = entry.find('title').first().text().trim();
      const publishedAt = new Date(entry.find('published').text());
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !title || !Number.isFinite(publishedAt.getTime()))
        return [];
      const views = Number(entry.find('media\\:statistics').attr('views') ?? 0);
      return [
        {
          videoId,
          title,
          publishedAt,
          channel,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          description: entry.find('media\\:description').text().trim() || null,
          views: Number.isSafeInteger(views) && views >= 0 ? Math.min(views, 2147483647) : 0,
        },
      ];
    });
}
