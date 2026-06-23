import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import { OgImageService } from '../common/og-image.service';

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
    // 일부 피드(NAVER D2 등)는 UA 없으면 406 차단 → 브라우저 UA 위장
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DevbriefBot/1.0; +https://devbrief.app)',
      Accept:
        'application/rss+xml, application/atom+xml, application/xml, text/xml; q=0.9, */*; q=0.8',
    },
    customFields: {
      item: [
        'content:encoded',
        'description',
        ['media:content', 'media:content', { keepArray: false }],
        ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
      ],
    },
  });

  constructor(private og: OgImageService) {}

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
    if (mediaContent?.url && (!mediaContent.medium || mediaContent.medium === 'image')) {
      return mediaContent.url;
    }

    const html = item['content:encoded'] ?? item.description ?? item.content ?? '';
    const match = /<img[^>]+src=["']([^"']+)["']/i.exec(String(html));
    if (match?.[1]) return match[1];

    return null;
  }

  /** RSS 우선, 없으면 article URL의 og:image fallback */
  async resolveImageUrl(item: RssItem): Promise<string | null> {
    const fromRss = this.extractImageFromItem(item);
    if (fromRss) return this.og.absolutize(fromRss, item.link);
    if (item.link) {
      return this.og.fetch(item.link);
    }
    return null;
  }
}
