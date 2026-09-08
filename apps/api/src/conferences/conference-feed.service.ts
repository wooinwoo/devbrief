import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { isBlockedHostname } from '../common/url-guard';
import { type DiscoveredConference, normalizeEventCandidate } from './event-candidate';
import { parseAwskrug, parseDevKorea, parseGdgIncheon } from './korean-event-feeds';

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
  { name: 'GDG Incheon', url: 'https://gdg.community.dev/gdg-incheon/', parse: parseGdgIncheon },
];

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
    return Promise.all(
      SOURCES.map(async (source): Promise<EventFeedResult> => {
        try {
          const response = await axios.get<string>(source.url, {
            responseType: 'text',
            timeout: 15_000,
            maxContentLength: 8_000_000,
            maxRedirects: 5,
            headers: { 'User-Agent': 'Devbrief/1.0 (+https://github.com/wooinwoo/devbrief)' },
            beforeRedirect: (options) => {
              if (
                !['http:', 'https:'].includes(options.protocol) ||
                isBlockedHostname(options.hostname)
              )
                throw new Error('Unsafe feed redirect');
            },
          });
          const rows = source.parse(response.data);
          const candidates = rows
            .map((row) => normalizeEventCandidate(row, now))
            .filter((row): row is DiscoveredConference => row !== null && row.url !== null);
          return { source: source.name, candidates, skipped: rows.length - candidates.length };
        } catch (error) {
          return {
            source: source.name,
            candidates: [],
            skipped: 0,
            error: error instanceof Error ? error.message : 'Feed failed',
          };
        }
      }),
    );
  }
}
