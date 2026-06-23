import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * 원문 URL에서 본문 평문을 추출한다 (LLM/유료 readability API 없이 cheerio 휴리스틱).
 * RSS에 본문이 안 실린 글(대부분)의 요약 재생성을 위해 필요.
 *
 * 전략: <article>/<main> 우선, 없으면 <p> 밀도가 가장 높은 컨테이너를 고른다.
 * nav/aside/footer/script/style 등 보일러플레이트는 제거.
 */
@Injectable()
export class ArticleFetchService {
  private readonly logger = new Logger(ArticleFetchService.name);

  /** 원문 본문 평문 (최대 max자). 실패하면 null. */
  async fetchBody(url: string, max = 1200): Promise<string | null> {
    let html: string;
    try {
      const { data } = await axios.get<string>(url, {
        timeout: 12_000,
        maxContentLength: 5_000_000,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DevbriefBot/1.0; +https://devbrief)',
          Accept: 'text/html,application/xhtml+xml',
        },
        // 4xx/5xx는 throw하지 않고 빈 본문 취급
        validateStatus: (s) => s >= 200 && s < 400,
      });
      html = typeof data === 'string' ? data : String(data);
    } catch (e) {
      this.logger.debug(`본문 fetch 실패 ${url}: ${(e as Error).message}`);
      return null;
    }

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
}
