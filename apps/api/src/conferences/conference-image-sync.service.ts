import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OgImageService } from '../common/og-image.service';

/**
 * 컨퍼런스 자동 이미지 동기화.
 * imageUrl이 비어 있는 컨퍼런스의 공식 URL에서 og:image / twitter:image 추출 후 저장.
 *
 * - 이미 imageUrl 채워진 컨퍼런스는 skip (운영자 수동 등록 우선)
 * - fetch 실패 시 graceful (brand 색 fallback으로 자연 처리)
 * - 동시 fetch 제한: 직렬로 5개씩 (서버 부담 / rate limit 회피)
 */
@Injectable()
export class ConferenceImageSyncService {
  private readonly logger = new Logger(ConferenceImageSyncService.name);

  constructor(
    private prisma: PrismaService,
    private og: OgImageService,
  ) {}

  /** imageUrl 없는 컨퍼런스 전부 sync. force=true 면 기존 값도 갱신. */
  async syncAll(opts: { force?: boolean } = {}): Promise<{
    total: number;
    updated: number;
    failed: number;
  }> {
    const where = opts.force ? {} : { imageUrl: null };
    const targets = await this.prisma.conference.findMany({ where });

    let updated = 0;
    let failed = 0;

    for (const c of targets) {
      try {
        const image = await this.og.fetch(c.url);
        if (!image) {
          failed++;
          this.logger.debug(`[${c.name}] og:image 없음`);
          continue;
        }
        await this.prisma.conference.update({
          where: { id: c.id },
          data: { imageUrl: image },
        });
        updated++;
        this.logger.log(`[${c.name}] image 자동 등록 → ${image}`);
      } catch (e) {
        failed++;
        this.logger.warn(`[${c.name}] sync 실패: ${(e as Error).message}`);
      }
    }

    return { total: targets.length, updated, failed };
  }
}
