import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

/**
 * 원문 URL에서 본문을 가져와 "정제된 HTML"로 추출한다.
 * 상세페이지에서 직접 읽을 수 있도록 안전한 태그/속성만 남긴다.
 *
 * - 네트워크 fetch 는 서버(Redis 없는 서빙 api)가 아니라 CLI(GitHub Actions)에서 돈다.
 * - 추출만 담당하고 저장은 CLI 가 한다(순수 함수에 가깝게 → 단위 테스트 용이).
 *
 * sanitize 안전성: dangerouslySetInnerHTML 로 렌더되므로 script/style/on* 핸들러/
 * javascript: 링크 등 위험 요소를 서버 단계에서 완전히 제거한다.
 */
@Injectable()
export class ArticleExtractService {
  private readonly logger = new Logger(ArticleExtractService.name);

  /** 렌더 시 살려둘 태그. 그 외 태그는 (위험하지 않으면) 풀어헤쳐 텍스트만 보존. */
  private static readonly ALLOWED_TAGS = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'a',
    'strong',
    'em',
    'b',
    'i',
    'img',
    'figure',
    'figcaption',
    'br',
    'hr',
  ]);

  /** 내용 자체를 통째로 버릴 위험/보일러플레이트 태그. */
  private static readonly DROP_TAGS = [
    'script',
    'style',
    'noscript',
    'nav',
    'header',
    'footer',
    'aside',
    'form',
    'iframe',
    'svg',
    'button',
    'input',
    'select',
    'textarea',
    'object',
    'embed',
    'video',
    'audio',
    'canvas',
    'link',
    'meta',
    'template',
  ];

  /** 본문으로 인정할 최소 평문 길이. 이보다 짧으면 추출 실패로 간주. */
  private static readonly MIN_TEXT_LEN = 200;

  /**
   * url 의 원문을 받아 정제된 본문 HTML 을 돌려준다. 실패/너무 짧으면 null.
   */
  async extract(url: string): Promise<string | null> {
    let html: string;
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
        headers: {
          'User-Agent': 'DevbriefBot/1.0 (+https://devbrief)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (!res.ok) {
        this.logger.debug(`본문 fetch 실패 ${url}: HTTP ${res.status}`);
        return null;
      }
      html = await res.text();
    } catch (e) {
      this.logger.debug(`본문 fetch 실패 ${url}: ${(e as Error).message}`);
      return null;
    }

    return this.extractFromHtml(html, url);
  }

  /**
   * 순수 추출 + 정제. 네트워크를 타지 않아 단위 테스트로 검증 가능.
   * @param html 원문 HTML
   * @param baseUrl 상대 링크/이미지 절대화에 쓰는 기준 URL
   */
  extractFromHtml(html: string, baseUrl: string): string | null {
    let $: cheerio.CheerioAPI;
    try {
      $ = cheerio.load(html);
    } catch (e) {
      this.logger.debug(`본문 파싱 실패 ${baseUrl}: ${(e as Error).message}`);
      return null;
    }

    // 1) 위험/보일러플레이트 태그 통째 제거
    $(ArticleExtractService.DROP_TAGS.join(',')).remove();
    // 광고/공유/관련글 등 흔한 노이즈 컨테이너 제거 (휴리스틱, class/id 부분일치)
    $(
      '[class*="advert"],[class*="-ad-"],[class*="ad-"],[id*="advert"],[class*="share"],[class*="social"],[class*="newsletter"],[class*="related"],[class*="comment"],[class*="promo"]',
    ).remove();

    // 2) 본문 루트 선정
    let root = $('article').first();
    if (root.length === 0) root = $('main').first();
    if (root.length === 0) root = $('[role="main"]').first();
    if (root.length === 0) {
      // <p> 텍스트가 가장 많은 컨테이너 추정
      let best: cheerio.Cheerio<any> | null = null;
      let bestLen = 0;
      $('div, section').each((_, el) => {
        const $el = $(el);
        const len = $el.find('p').text().length;
        if (len > bestLen) {
          bestLen = len;
          best = $el;
        }
      });
      root = best ?? $('body');
    }
    if (root.length === 0) return null;

    // 3) 정제: 허용 안 된 태그는 풀어헤치고(unwrap), 위험 잔재는 제거
    this.sanitize($, root, baseUrl);

    let out = (root.html() ?? '').replace(/\s+/g, ' ').trim();
    // 빈 블록 정리
    out = out
      .replace(/<(p|li|blockquote|figcaption|h[1-4])>\s*<\/\1>/gi, '')
      .replace(/(\s*<br\s*\/?>\s*){2,}/gi, '<br />')
      .trim();

    // 평문 길이로 본문 충실도 판정
    const textLen = cheerio.load(out).text().replace(/\s+/g, ' ').trim().length;
    if (textLen < ArticleExtractService.MIN_TEXT_LEN) return null;

    return out;
  }

  /** root 하위를 허용 태그/속성만 남도록 정제한다. */
  private sanitize($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>, baseUrl: string): void {
    const ALLOWED = ArticleExtractService.ALLOWED_TAGS;

    // 허용되지 않은(그러나 위험 태그는 1단계에서 이미 제거된) 태그는 자식만 남기고 unwrap.
    // unwrap 시 자식이 위로 올라오므로, 더 이상 없을 때까지 반복(중첩 div 등).
    for (let i = 0; i < 50; i++) {
      const disallowed = root.find('*').filter((_, el) => {
        const name = (el as { tagName?: string }).tagName?.toLowerCase();
        return !!name && !ALLOWED.has(name);
      });
      if (disallowed.length === 0) break;
      disallowed.each((_, el) => {
        const $el = $(el);
        const contents = $el.contents();
        if (contents.length > 0) $el.replaceWith(contents);
        else $el.remove();
      });
    }

    // 허용 태그의 속성 정제
    root.find('*').each((_, el) => {
      const node = el as { tagName?: string; attribs?: Record<string, string> };
      const name = node.tagName?.toLowerCase();
      const $el = $(el);
      const attribs = { ...(node.attribs ?? {}) };

      for (const attr of Object.keys(attribs)) {
        const keep = this.shouldKeepAttr(name, attr, attribs[attr], baseUrl);
        if (keep === false) {
          $el.removeAttr(attr);
        } else if (typeof keep === 'string') {
          $el.attr(attr, keep);
        }
      }

      if (name === 'a') {
        const href = $el.attr('href');
        if (!href) {
          // href 없는 a 는 텍스트만 남기고 unwrap
          $el.replaceWith($el.contents());
          return;
        }
        $el.attr('target', '_blank');
        $el.attr('rel', 'noopener noreferrer nofollow');
      }
      if (name === 'img') {
        const src = $el.attr('src');
        if (!src) $el.remove();
      }
    });
  }

  /**
   * 속성 보존 여부. false=제거, string=교체(절대 URL 등), true=그대로.
   * 안전: on* 핸들러/style/class/id/data-* 전부 제거. href/src 는 http(s) 만.
   */
  private shouldKeepAttr(
    tag: string | undefined,
    attr: string,
    value: string,
    baseUrl: string,
  ): boolean | string {
    if (tag === 'a' && attr === 'href') {
      const abs = this.toAbsoluteUrl(value, baseUrl);
      return abs ?? false;
    }
    if (tag === 'img' && attr === 'src') {
      const abs = this.toAbsoluteUrl(value, baseUrl);
      return abs ?? false;
    }
    if (tag === 'img' && attr === 'alt') return true;
    // 그 외 모든 속성(style/class/id/on*/data-* 등) 제거
    return false;
  }

  /** http/https 절대 URL 로 변환. 그 외(javascript:, data:, mailto: 등)는 거부. */
  private toAbsoluteUrl(value: string, baseUrl: string): string | null {
    try {
      const u = new URL(value, baseUrl);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
      return null;
    } catch {
      return null;
    }
  }
}
