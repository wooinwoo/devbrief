import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface TrendingRepo {
  fullName: string; // owner/repo
  owner: string;
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  periodStars: number; // 기간 내 증가 star (velocity)
  rank: number; // 1부터
}

/**
 * github.com/trending HTML 스크래핑.
 * 공개 페이지라 토큰 불필요. velocity("X stars today/this week")가
 * 페이지에 직접 노출되므로 자체 시계열 추적이 필요 없다.
 */
@Injectable()
export class GithubTrendingService {
  private readonly logger = new Logger(GithubTrendingService.name);

  async fetch(period: 'daily' | 'weekly'): Promise<TrendingRepo[]> {
    const url = `https://github.com/trending?since=${period}`;
    try {
      const { data: html } = await axios.get<string>(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; DevbriefBot/1.0; +https://devbrief.app)',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 15_000,
      });
      return this.parse(html);
    } catch (e) {
      this.logger.error(
        `trending ${period} fetch 실패: ${(e as Error).message}`,
      );
      return [];
    }
  }

  private parse(html: string): TrendingRepo[] {
    const $ = cheerio.load(html);
    const repos: TrendingRepo[] = [];

    $('article.Box-row').each((i, el) => {
      const $el = $(el);
      const href = ($el.find('h2 a').attr('href') ?? '').trim();
      const fullName = href.replace(/^\//, '');
      if (!fullName.includes('/')) return;
      const [owner, name] = fullName.split('/');

      const description = $el.find('p').first().text().trim() || null;
      const language =
        $el.find('[itemprop="programmingLanguage"]').first().text().trim() ||
        null;
      const languageColor =
        /background-color:\s*([^;]+)/
          .exec($el.find('.repo-language-color').first().attr('style') ?? '')?.[1]
          ?.trim() ?? null;

      // 총 star / fork: href 패턴 우선(견고), 없으면 a.Link--muted 인덱스 fallback
      const muted = $el.find('a.Link--muted');
      const starLink = $el.find('a[href$="/stargazers"]');
      const forkLink = $el.find(
        'a[href$="/forks"], a[href$="/network/members"]',
      );
      const stars = this.num(
        (starLink.length ? starLink : $(muted[0])).first().text(),
      );
      const forks = this.num(
        (forkLink.length ? forkLink : $(muted[1])).first().text(),
      );
      // 기간 증가 star: 우하단 "X stars today/this week"
      const periodStars = this.num($el.find('.float-sm-right').text());

      repos.push({
        fullName,
        owner,
        name,
        url: `https://github.com${href}`,
        description,
        language,
        languageColor,
        stars,
        forks,
        periodStars,
        rank: i + 1,
      });
    });

    return repos;
  }

  /** "12,345" / "1.2k stars today" → 정수 */
  private num(s: string): number {
    const cleaned = s.replace(/,/g, '');
    const m = /([\d.]+)\s*(k)?/i.exec(cleaned);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    return Math.round(m[2] ? n * 1000 : n);
  }
}
