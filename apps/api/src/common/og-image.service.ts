import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * 페이지 URL에서 og:image / twitter:image 추출.
 * RSS 글 / 컨퍼런스 홈페이지 등에서 공통 사용.
 */
@Injectable()
export class OgImageService {
  private readonly logger = new Logger(OgImageService.name);

  async fetch(pageUrl: string, timeoutMs = 5000): Promise<string | null> {
    try {
      const res = await axios.get<string>(pageUrl, {
        timeout: timeoutMs,
        maxContentLength: 2_000_000,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DevbriefBot/1.0; +https://devbrief.dev)',
        },
      });
      return this.parse(res.data, pageUrl);
    } catch (e) {
      this.logger.debug(`og:image fetch 실패 ${pageUrl}: ${(e as Error).message}`);
      return null;
    }
  }

  /** HTML에서 og:image / twitter:image / link rel=image_src 추출 + 절대화 */
  parse(html: string, baseUrl?: string): string | null {
    const og =
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i.exec(
        html,
      ) ??
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html) ??
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(html) ??
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i.exec(html) ??
      /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i.exec(html);

    const raw = og?.[1];
    if (!raw) return null;
    return this.absolutize(raw, baseUrl);
  }

  absolutize(src: string, base?: string): string {
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
