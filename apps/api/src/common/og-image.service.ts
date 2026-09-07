import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { fetchPublicResource } from './public-resource';
import { isBlockedHostname } from './url-guard';

@Injectable()
export class OgImageService {
  private readonly logger = new Logger(OgImageService.name);

  async fetch(pageUrl: string, timeoutMs = 8000): Promise<string | null> {
    try {
      const res = await fetchPublicResource<string>(pageUrl, {
        timeout: timeoutMs,
        maxContentLength: 2_000_000,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DevbriefBot/1.0; +https://devbrief.pages.dev)',
        },
      });
      return this.parse(res.data, res.config.url ?? pageUrl);
    } catch (e) {
      this.logger.debug(`og:image fetch 실패 ${pageUrl}: ${(e as Error).message}`);
      return null;
    }
  }

  parse(html: string, baseUrl?: string): string | null {
    const $ = cheerio.load(html);
    for (const selector of [
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'link[rel="image_src"]',
    ]) {
      for (const node of $(selector).toArray()) {
        const raw = ($(node).attr('content') ?? $(node).attr('href'))?.trim();
        if (!raw) continue;
        try {
          const url = new URL(this.absolutize(raw, baseUrl));
          if (
            ['https:', 'http:'].includes(url.protocol) &&
            !url.username &&
            !url.password &&
            !isBlockedHostname(url.hostname)
          )
            return url.href;
        } catch {
          /* Try the next published metadata image. */
        }
      }
    }
    return null;
  }

  absolutize(src: string, base?: string): string {
    if (src.startsWith('//')) return `https:${src}`;
    try {
      return new URL(src, base).href;
    } catch {
      return src;
    }
  }
}
