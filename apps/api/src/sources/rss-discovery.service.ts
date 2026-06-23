import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import Parser from 'rss-parser';
import { PrismaService } from '../prisma/prisma.service';
import { OgImageService } from '../common/og-image.service';

export interface DiscoveredFeed {
  feedUrl: string;
  title: string;
  type: 'rss' | 'atom';
}

/**
 * 사용자가 URL 하나 입력하면:
 * 1) 그 URL이 직접 RSS/Atom 피드면 그대로 사용
 * 2) 일반 페이지면 HTML 안의 <link rel="alternate" type="application/rss+xml">,
 *    <link rel="alternate" type="application/atom+xml"> 자동 탐지
 * 3) 그래도 못 찾으면 흔한 경로 시도 (/rss, /feed, /rss.xml, /atom.xml)
 */
@Injectable()
export class RssDiscoveryService {
  private readonly logger = new Logger(RssDiscoveryService.name);
  private parser = new Parser({ timeout: 8000 });

  constructor(
    private prisma: PrismaService,
    private og: OgImageService,
  ) {}

  /** URL → 발견된 피드 후보들 (최대 5개) */
  async discover(input: string): Promise<DiscoveredFeed[]> {
    const url = input.trim();
    if (!url) return [];

    // 1) 직접 피드 시도
    const direct = await this.tryParseFeed(url);
    if (direct) return [direct];

    // 2) HTML <link rel=alternate> 파싱
    const html = await this.fetchHtml(url);
    if (html) {
      const fromLinks = this.extractAlternateLinks(html, url);
      if (fromLinks.length > 0) {
        return this.validateFeeds(fromLinks);
      }
    }

    // 3) 흔한 경로 시도
    const guesses = this.guessFeedPaths(url);
    return this.validateFeeds(guesses);
  }

  /** discover + DB Source upsert. 중복 feedUrl이면 reuse. */
  async discoverAndRegister(
    input: string,
  ): Promise<{ created: number; existing: number; feeds: DiscoveredFeed[] }> {
    const feeds = await this.discover(input);
    let created = 0;
    let existing = 0;

    for (const f of feeds) {
      const existed = await this.prisma.source.findUnique({
        where: { feedUrl: f.feedUrl },
      });
      if (existed) {
        existing++;
        continue;
      }
      await this.prisma.source.create({
        data: {
          provider: 'rss_generic',
          name: f.title.slice(0, 100),
          feedUrl: f.feedUrl,
          homepage: input,
          language: this.detectLanguage(f.title),
          active: true,
        },
      });
      created++;
      this.logger.log(`RSS source 자동 등록: ${f.title} → ${f.feedUrl}`);
    }
    return { created, existing, feeds };
  }

  private async tryParseFeed(url: string): Promise<DiscoveredFeed | null> {
    try {
      const feed = await this.parser.parseURL(url);
      const title = feed.title ?? url;
      return { feedUrl: url, title, type: 'rss' };
    } catch {
      return null;
    }
  }

  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const res = await axios.get<string>(url, {
        timeout: 5000,
        maxContentLength: 2_000_000,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DevbriefBot/1.0; +https://devbrief.dev)',
        },
      });
      return res.data;
    } catch {
      return null;
    }
  }

  extractAlternateLinks(html: string, baseUrl: string): DiscoveredFeed[] {
    const found: DiscoveredFeed[] = [];
    // <link rel="alternate" type="application/rss+xml" title="..." href="...">
    // 순서 무관 처리 위해 link 태그 전체 추출 후 속성 파싱
    const linkRe = /<link\b([^>]*?)\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html)) !== null) {
      const attrs = m[1];
      const type = this.attr(attrs, 'type');
      const rel = this.attr(attrs, 'rel');
      const href = this.attr(attrs, 'href');
      const title = this.attr(attrs, 'title') ?? 'Untitled feed';

      if (!href || !type || !rel) continue;
      if (!rel.toLowerCase().includes('alternate')) continue;

      const t = type.toLowerCase();
      const feedType: 'rss' | 'atom' | null =
        t.includes('rss') ? 'rss' : t.includes('atom') ? 'atom' : null;
      if (!feedType) continue;

      found.push({
        feedUrl: this.og.absolutize(href, baseUrl),
        title,
        type: feedType,
      });
    }
    return found.slice(0, 5);
  }

  guessFeedPaths(baseUrl: string): DiscoveredFeed[] {
    try {
      const u = new URL(baseUrl);
      const origin = `${u.protocol}//${u.host}`;
      const paths = ['/rss', '/feed', '/rss.xml', '/atom.xml', '/feed.xml'];
      return paths.map((p) => ({
        feedUrl: `${origin}${p}`,
        title: u.host,
        type: p.includes('atom') ? ('atom' as const) : ('rss' as const),
      }));
    } catch {
      return [];
    }
  }

  /** 후보 URL이 실제 피드인지 검증해서 valid만 반환. */
  private async validateFeeds(
    candidates: DiscoveredFeed[],
  ): Promise<DiscoveredFeed[]> {
    const valid: DiscoveredFeed[] = [];
    for (const c of candidates) {
      const real = await this.tryParseFeed(c.feedUrl);
      if (real) {
        valid.push({ ...c, title: real.title || c.title });
      }
    }
    return valid;
  }

  private attr(attrs: string, name: string): string | null {
    const re = new RegExp(`${name}=["']([^"']+)["']`, 'i');
    const m = re.exec(attrs);
    return m?.[1] ?? null;
  }

  private detectLanguage(title: string): string {
    return /[가-힣]/.test(title) ? 'ko' : 'en';
  }
}
