import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Vibrant } from 'node-vibrant/node';

/**
 * 이미지 URL에서 dominant brand 색 추출 후 oklch 변환.
 * 컨퍼런스 키비주얼 / 영상 썸네일 등에서 자동 brand color 생성.
 */
@Injectable()
export class BrandColorService {
  private readonly logger = new Logger(BrandColorService.name);

  /**
   * imageUrl → buffer → palette → 가장 채도 높은 색 → oklch 문자열.
   * 실패 시 null (fallback은 호출자가 결정).
   */
  async extractFromUrl(imageUrl: string, timeoutMs = 8000): Promise<string | null> {
    try {
      const res = await axios.get<ArrayBuffer>(imageUrl, {
        responseType: 'arraybuffer',
        timeout: timeoutMs,
        maxContentLength: 5_000_000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DevbriefBot/1.0; +https://devbrief.dev)',
        },
      });
      const buf = Buffer.from(res.data);
      const palette = await Vibrant.from(buf).getPalette();

      // 우선순위: Vibrant → Muted → DarkVibrant → LightVibrant
      const swatch =
        palette.Vibrant ?? palette.Muted ?? palette.DarkVibrant ?? palette.LightVibrant;

      if (!swatch?.rgb) return null;
      const [r, g, b] = swatch.rgb;
      return rgbToOklch(r, g, b);
    } catch (e) {
      this.logger.debug(`brand color 추출 실패 ${imageUrl}: ${(e as Error).message}`);
      return null;
    }
  }
}

/**
 * sRGB → linear → OKLab → OKLCH 변환.
 * Björn Ottosson 의 OKLab 공식 (https://bottosson.github.io/posts/oklab/).
 * 결과는 CSS oklch() 문자열, L은 %, C와 h는 raw.
 */
export function rgbToOklch(r: number, g: number, b: number): string {
  const [or, og, ob] = [r, g, b].map(srgbToLinear) as [number, number, number];

  // linear sRGB → LMS
  const l = 0.4122214708 * or + 0.5363325363 * og + 0.0514459929 * ob;
  const m = 0.2119034982 * or + 0.6806995451 * og + 0.1073969566 * ob;
  const s = 0.0883024619 * or + 0.2817188376 * og + 0.6299787005 * ob;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS → OKLab
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // OKLab → OKLCH
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;

  // brand 색은 너무 어둡거나 너무 채도 낮으면 무의미 — clamp/floor
  const lPct = Math.round(L * 100);
  const cRound = Math.max(0.05, Number(C.toFixed(2)));
  const hRound = Math.round(H);

  return `oklch(${lPct}% ${cRound} ${hRound})`;
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
