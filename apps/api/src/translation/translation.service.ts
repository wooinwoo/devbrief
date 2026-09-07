import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * 무료 번역 (키 불필요). Gemini 한도/만료와 무관하게 한국어화를 유지하기 위한 경로.
 * 1순위 Google 비공식(translate_a) → 2순위 MyMemory. 둘 다 실패하면 null.
 *
 * 비공식 엔드포인트라 대량 호출 시 IP 차단 위험 → 서비스 내부에서 최소 호출
 * 간격을 보장한다 (큐 limiter 를 우회하는 CLI 직접 호출 경로 포함).
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  /** 외부 번역 호출 최소 간격 — 연속 발사만 늦추고 드문 호출엔 지연 0 */
  private static readonly MIN_INTERVAL_MS = 300;
  private lastCallAt = 0;
  private googleRetryAt = 0;
  private myMemoryRetryAt = 0;
  private throttleChain: Promise<void> = Promise.resolve();

  /** 직전 호출로부터 MIN_INTERVAL_MS 를 보장. 동시 호출은 promise 체인으로 직렬화. */
  private throttle(): Promise<void> {
    const waited = this.throttleChain.then(async () => {
      const wait = this.lastCallAt + TranslationService.MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastCallAt = Date.now();
    });
    // 실패해도 체인이 끊기지 않게
    this.throttleChain = waited.catch(() => undefined);
    return waited;
  }

  // 번역하면 안 되는 매체·고유명사 (그대로 두어야 자연스러움).
  // 번역 전 placeholder로 가렸다가 번역 후 복원한다.
  private readonly PROTECT = [
    'Import AI',
    'Latent Space',
    'Hacker News',
    'Show HN',
    'Ask HN',
    'Google DeepMind',
    'Hugging Face',
    'Simon Willison',
    'Cloudflare',
    'Show & Tell',
  ];

  /** 한글 음절이 하나라도 있으면 이미 한국어로 간주 */
  hasKorean(s: string): boolean {
    return /[가-힣]/.test(s);
  }

  /** 영문 → 한국어. 이미 한국어거나 빈 값이면 null. */
  async toKorean(text: string): Promise<string | null> {
    const t = (text ?? '').trim();
    if (!t || this.hasKorean(t)) return null;

    // 보호 토큰 마스킹 → 번역 → 복원
    const tokens: string[] = [];
    let masked = t;
    for (const name of this.PROTECT) {
      masked = masked.replace(
        new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        (m) => {
          tokens.push(m);
          return `⟦${tokens.length - 1}⟧`;
        },
      );
    }

    await this.throttle();
    const out = (await this.viaGoogle(masked)) ?? (await this.viaMyMemory(masked));
    if (!out) return null;
    // 복원 (혹시 번역기가 placeholder를 깨먹었으면 잔여물 제거)
    return out
      .replace(/⟦\s*(\d+)\s*⟧/g, (_, i) => tokens[Number(i)] ?? '')
      .replace(/⟦.*?⟧/g, '')
      .trim();
  }

  private async viaGoogle(text: string): Promise<string | null> {
    if (Date.now() < this.googleRetryAt) return null;
    try {
      const { data } = await axios.get<unknown[]>(
        'https://translate.googleapis.com/translate_a/single',
        {
          params: { client: 'gtx', sl: 'en', tl: 'ko', dt: 't', q: text },
          timeout: 10_000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        },
      );
      const segs = data?.[0];
      if (Array.isArray(segs)) {
        const out = segs
          .map((s) => (Array.isArray(s) ? (s[0] as string) : ''))
          .join('')
          .trim();
        return out || null;
      }
    } catch (e) {
      const response = (e as { response?: { status?: number; headers?: Record<string, string> } })
        .response;
      if (response?.status === 429) {
        const retrySeconds = Number(response.headers?.['retry-after']);
        this.googleRetryAt =
          Date.now() +
          Math.max(
            60_000,
            Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds * 1000 : 300_000,
          );
      }
      this.logger.debug(`google 번역 실패: ${(e as Error).message}`);
    }
    return null;
  }

  private async viaMyMemory(text: string): Promise<string | null> {
    // MyMemory accepts at most 500 UTF-8 bytes, not 500 characters.
    // Keep the original excerpt when a translation cannot be requested safely.
    if (Date.now() < this.myMemoryRetryAt || Buffer.byteLength(text, 'utf8') > 500) return null;
    try {
      const { data } = await axios.get<{
        responseStatus?: number | string;
        quotaFinished?: boolean;
        responseData?: { translatedText?: string };
      }>('https://api.mymemory.translated.net/get', {
        params: { q: text, langpair: 'en|ko' },
        timeout: 10_000,
      });
      if (data?.quotaFinished) this.myMemoryRetryAt = Date.now() + 86_400_000;
      if (Number(data?.responseStatus) !== 200 || data.quotaFinished) return null;
      const out = data?.responseData?.translatedText?.trim();
      if (
        out &&
        /QUERY LENGTH LIMIT EXCEEDED|MYMEMORY WARNING|USED ALL AVAILABLE FREE TRANSLATIONS/i.test(
          out,
        )
      )
        return null;
      return out || null;
    } catch (e) {
      this.logger.debug(`mymemory 번역 실패: ${(e as Error).message}`);
    }
    return null;
  }
}
