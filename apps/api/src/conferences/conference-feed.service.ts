import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { isBlockedHostname } from '../common/url-guard';
import { type DiscoveredConference, normalizeEventCandidate } from './event-candidate';
import { parseAwskrug, parseDevKorea, parseGdgChapter } from './korean-event-feeds';

const SOURCES = [
  {
    name: 'Developer Conferences Agenda',
    url: 'https://developers.events/all-events.json',
    parse: parseAgenda,
  },
  { name: 'Major League Hacking', url: 'https://www.mlh.com/events', parse: parseMlh },
  {
    name: 'AWSKRUG',
    url: 'https://www.meetup.com/awskrug/events/ical/',
    parse: parseAwskrug,
  },
  { name: 'Dev Korea', url: 'https://dev-korea.com/events', parse: parseDevKorea },
];

/**
 * 공개 예정 목록이 있는 국내 GDG 챕터(2026-11-10 확인). 같은 사이트라 robots.txt의 Crawl-delay(2초)를
 * 지켜 순서대로 요청한다. 행사 플랫폼(이벤터스·온오프믹스·Festa)과 Dev-Event 목록은 robots.txt나
 * 이용 정책이 자동 수집을 금지해 넣지 않는다.
 */
const GDG_KOREA_CHAPTERS = [
  'gdg-incheon',
  'gdg-seoul',
  'gdg-korea-android',
  'gdg-pangyo',
  'gdg-busan',
  'gdg-daejeon',
  'gdg-cloud-korea',
  'gdg-campus-korea',
];
const GDG_CRAWL_DELAY_MS = process.env.JEST_WORKER_ID ? 0 : 2_000;

function datePart(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  if (typeof value === 'string')
    return /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) ? value.slice(0, 10) : null;
  return date.toISOString().slice(0, 10);
}

/** 게시자가 제공하는 JSON 피드만 읽으며, 행사 상세 페이지를 추가 크롤링하지 않는다. */
export function parseAgenda(text: string): unknown[] {
  const rows: unknown = JSON.parse(text);
  if (!Array.isArray(rows)) throw new Error('Agenda feed must be an array');
  return rows.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Record<string, unknown>;
    if (row.status !== 'open' || !Array.isArray(row.date) || !row.date.length) return [];
    // 범위의 각 날짜가 숫자인지 확인한 뒤 양 끝 날짜를 사용한다.
    if (row.date.some((date) => typeof date !== 'number' || !Number.isFinite(date))) return [];
    const tags = Array.isArray(row.tags) ? row.tags : [];
    return [
      {
        name: row.name,
        url: row.hyperlink,
        startDate: datePart(Math.min(...row.date)),
        endDate: datePart(Math.max(...row.date)),
        location: row.location,
        topics: tags
          .filter((tag) => tag && ['tech', 'topic'].includes(tag.key))
          .map((tag) => tag.value),
        description:
          '일정 출처: Developer Conferences Agenda — Aurélie Vache & contributors. https://developers.events/ · CC BY-NC 4.0. 원본 일정에서 행사명·날짜·장소·주제를 추출했습니다.',
      },
    ];
  });
}

/** MLH 공개 페이지에 포함된 행사 데이터를 사용한다. 연도별 URL은 사이트 리다이렉트를 따른다. */
export function parseMlh(html: string): unknown[] {
  const $ = cheerio.load(html);
  const raw = $('script[data-page="app"][type="application/json"]').text();
  const data = JSON.parse(raw);
  const rows: unknown = data?.props?.upcomingEvents;
  if (!Array.isArray(rows)) throw new Error('MLH upcomingEvents missing');
  return rows.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Record<string, unknown>;
    if (['cancelled', 'canceled', 'draft'].includes(String(row.status))) return [];
    const path = typeof row.websiteUrl === 'string' && row.websiteUrl ? row.websiteUrl : row.url;
    let url: string | null = null;
    try {
      if (typeof path === 'string') url = new URL(path, 'https://www.mlh.com').href;
    } catch {
      /* 저장 경계에서 제외 */
    }
    return [
      {
        name: row.name,
        url,
        startDate: datePart(row.startsAt),
        endDate: row.endsAt == null ? null : (datePart(row.endsAt) ?? 'invalid'),
        location:
          row.formatType === 'digital'
            ? '온라인'
            : [row.location, (row.venueAddress as { country?: string } | null)?.country]
                .filter(Boolean)
                .join(', '),
        topics: ['Hackathon'],
        kind: 'hackathon',
        description:
          '일정 출처: Major League Hacking. https://www.mlh.com/events · 참가 조건과 신청 일정은 행사 공식 페이지에서 확인하세요.',
      },
    ];
  });
}

export interface EventFeedResult {
  source: string;
  candidates: DiscoveredConference[];
  skipped: number;
  error?: string;
}

@Injectable()
export class ConferenceFeedService {
  async collect(): Promise<EventFeedResult[]> {
    const now = new Date();
    const toResult = (source: string, rows: unknown[], error?: string): EventFeedResult => {
      const candidates = rows
        .map((row) => normalizeEventCandidate(row, now))
        .filter((row): row is DiscoveredConference => row !== null && row.url !== null);
      return {
        source,
        candidates,
        skipped: rows.length - candidates.length,
        ...(error ? { error } : {}),
      };
    };
    const feeds = SOURCES.map(async (source): Promise<EventFeedResult> => {
      try {
        return toResult(source.name, source.parse(await getFeed(source.url)));
      } catch (error) {
        return { source: source.name, candidates: [], skipped: 0, error: errorMessage(error) };
      }
    });
    // 챕터 하나가 실패해도 나머지는 싣는다. 전부 실패할 때만 출처 오류로 남긴다.
    const gdg = (async (): Promise<EventFeedResult> => {
      const rows: unknown[] = [];
      const errors: string[] = [];
      for (const [index, slug] of GDG_KOREA_CHAPTERS.entries()) {
        if (index > 0 && GDG_CRAWL_DELAY_MS > 0)
          await new Promise((resolve) => setTimeout(resolve, GDG_CRAWL_DELAY_MS));
        try {
          rows.push(...parseGdgChapter(await getFeed(`https://gdg.community.dev/${slug}/`), slug));
        } catch (error) {
          errors.push(errorMessage(error));
        }
      }
      return toResult(
        'GDG Korea',
        rows,
        errors.length === GDG_KOREA_CHAPTERS.length ? errors[0] : undefined,
      );
    })();
    return Promise.all([...feeds, gdg]);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Feed failed';
}

async function getFeed(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    responseType: 'text',
    timeout: 15_000,
    maxContentLength: 8_000_000,
    maxRedirects: 5,
    headers: { 'User-Agent': 'Devbrief/1.0 (+https://github.com/wooinwoo/devbrief)' },
    beforeRedirect: (options) => {
      if (!['http:', 'https:'].includes(options.protocol) || isBlockedHostname(options.hostname))
        throw new Error('Unsafe feed redirect');
    },
  });
  return response.data;
}
