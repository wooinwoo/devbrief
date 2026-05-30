import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import axios from 'axios';

export type RssItem = Parser.Item & {
  'content:encoded'?: string;
  description?: string;
  enclosure?: { url?: string; type?: string };
  'media:content'?: { $?: { url?: string; medium?: string } };
  'media:thumbnail'?: { $?: { url?: string } };
};

@Injectable()
export class RssParserService {
  private readonly logger = new Logger(RssParserService.name);
  private parser = new Parser<Record<string, unknown>, RssItem>({
    timeout: 10_000,
    customFields: {
      item: [
        'content:encoded',
        'description',
        ['media:content', 'media:content', { keepArray: false }],
        ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
      ],
    },
  });

  async parse(url: string): Promise<Parser.Output<RssItem>> {
    return this.parser.parseURL(url);
  }

  /**
   * RSS item에서 이미지 후보 추출. 우선순위:
   * 1) enclosure (image/*)
   * 2) media:thumbnail / media:content
   * 3) content:encoded / description 안의 첫 <img src>
   */
  extractImageFromItem(item: RssItem): string | null {
    const enc = item.enclosure;
    if (enc?.url && (!enc.type || enc.type.startsWith('image/'))) {
      return enc.url;
    }

    const mediaThumb = item['media:thumbnail']?.$?.url;
    if (mediaThumb) return mediaThumb;

    const mediaContent = item['media:content']?.$;
    if (
      mediaContent?.url &&
      (!mediaContent.medium || mediaContent.medium === 'image')
    ) {
      return mediaContent.url;
    }

    const html =
      item['content:encoded'] ?? item.description ?? item.content ?? '';
    const match = /<img[^>]+src=["']([^"']+)["']/i.exec(String(html));
    if (match?.[1]) return match[1];

    return null;
  }

  /**
   * article URL에서 og:image fetch. 5초 타임아웃, 실패 시 null.
   */
  async fetchOgImage(url: string): Promise<string | null> {
    try {
      const res = await axios.get<string>(url, {
        timeout: 5000,
        maxContentLength: 2_000_000,
        responseType: 'text',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; PulseBot/1.0; +https://pulse.dev)',
        },
      });
      const html = res.data;
      const og =
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(
          html,
        ) ??
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(
          html,
        ) ??
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(
          html,
        );
      return og?.[1] ?? null;
    } catch (e) {
      this.logger.debug(`og:image 추출 실패 ${url}: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * 추출 통합 — RSS 우선, 없으면 og:image fallback.
   */
  async resolveImageUrl(item: RssItem): Promise<string | null> {
    const fromRss = this.extractImageFromItem(item);
    if (fromRss) return this.absolutize(fromRss, item.link);
    if (item.link) {
      const og = await this.fetchOgImage(item.link);
      return og ? this.absolutize(og, item.link) : null;
    }
    return null;
  }

  private absolutize(src: string, base?: string): string {
    if (src.startsWith('//')) return `https:${src}`;
    if (src.startsWith('/') && base) {
      try {
        const u = new URL(base);
        return `${u.protocol}//${u.host}${src}`;
      } catch {
        return src;
      }
    }
    return src;
  }
}
