import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { isBlockedHostname } from '../common/url-guard';

/**
 * 원문 URL에서 본문 평문을 추출한다 (LLM/유료 readability API 없이 cheerio 휴리스틱).
 * RSS에 본문이 안 실린 글(대부분)의 요약 재생성을 위해 필요.
 *
 * 전략: <article>/<main> 우선, 없으면 <p> 밀도가 가장 높은 컨테이너를 고른다.
 * nav/aside/footer/script/style 등 보일러플레이트는 제거.
 *
 * URL 은 피드가 준 값이라 신뢰 불가 — 리다이렉트 자동 추종을 끄고 수동 홉
 * (최대 3회)마다 프로토콜(http/https)과 내부망 호스트를 재검증한다 (SSRF 은닉 차단).
 */
@Injectable()
export class ArticleFetchService {
  private readonly logger = new Logger(ArticleFetchService.name);

  private static readonly MAX_REDIRECTS = 3;

  /** 원문 본문 평문 (최대 max자). 실패하면 null. */
  async fetchBody(url: string, max = 1200): Promise<string | null> {
    const html = await this.fetchHtml(url);
    if (html === null) return null;

    try {
      const $ = cheerio.load(html);
      // 보일러플레이트 제거
      $('script, style, noscript, nav, aside, footer, header, form, iframe, svg, button').remove();

      // 1순위: 시맨틱 컨테이너
      let root = $('article').first();
      if (root.length === 0) root = $('main').first();
      if (root.length === 0) root = $('[role="main"]').first();

      // 2순위: <p> 텍스트가 가장 많은 컨테이너 추정
      if (root.length === 0) {
        let best: cheerio.Cheerio<any> | null = null;
        let bestLen = 0;
        $('div, section').each((_, el) => {
          const $el = $(el);
          const len = $el.find('> p').text().length;
          if (len > bestLen) {
            bestLen = len;
            best = $el;
          }
        });
        root = best ?? $('body');
      }

      const paras = root
        .find('p, li')
        .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
        .get()
        .filter((t) => t.length >= 30); // 메뉴/캡션 같은 짧은 조각 제외

      const text = (paras.length ? paras.join(' ') : root.text()).replace(/\s+/g, ' ').trim();

      if (text.length < 40) return null;
      return text.slice(0, max);
    } catch (e) {
      this.logger.debug(`본문 파싱 실패 ${url}: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * 리다이렉트를 수동으로 최대 MAX_REDIRECTS 회 추종하며 HTML 을 가져온다.
   * 매 홉마다 http/https 프로토콜과 내부망/사설 대역 호스트를 재검증. 실패 시 null.
   */
  private async fetchHtml(startUrl: string): Promise<string | null> {
    let current = startUrl;
    for (let hop = 0; hop <= ArticleFetchService.MAX_REDIRECTS; hop++) {
      let target: URL;
      try {
        target = new URL(current);
      } catch {
        this.logger.debug(`잘못된 URL ${current}`);
        return null;
      }
      if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        this.logger.debug(`허용되지 않는 프로토콜 ${target.protocol} (${current})`);
        return null;
      }
      if (isBlockedHostname(target.hostname)) {
        this.logger.debug(`내부망/사설 대역 URL 차단 ${current}`);
        return null;
      }

      try {
        const res = await axios.get<string>(current, {
          timeout: 12_000,
          maxContentLength: 5_000_000,
          responseType: 'text',
          maxRedirects: 0, // 자동 추종 금지 — 위에서 홉마다 재검증
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DevbriefBot/1.0; +https://devbrief)',
            Accept: 'text/html,application/xhtml+xml',
          },
          // 3xx 는 아래에서 수동 홉 처리, 4xx/5xx 는 throw 하지 않고 빈 본문 취급
          validateStatus: (s) => s >= 200 && s < 400,
        });
        if (res.status >= 300) {
          const location = (res.headers as Record<string, unknown>)?.location;
          if (typeof location !== 'string' || !location) {
            this.logger.debug(`3xx 인데 Location 없음 ${current}`);
            return null;
          }
          current = new URL(location, current).toString();
          continue;
        }
        return typeof res.data === 'string' ? res.data : String(res.data);
      } catch (e) {
        this.logger.debug(`본문 fetch 실패 ${current}: ${(e as Error).message}`);
        return null;
      }
    }
    this.logger.debug(`리다이렉트 한도(${ArticleFetchService.MAX_REDIRECTS}) 초과 ${startUrl}`);
    return null;
  }
}
