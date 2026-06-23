import { Injectable, Logger } from '@nestjs/common';
import { BrandColorService } from '../common/brand-color.service';
import { OgImageService } from '../common/og-image.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 컨퍼런스 자동 이미지 동기화 + brand 색 추출.
 * imageUrl이 비어 있는 컨퍼런스의 공식 URL에서 og:image 추출 후,
 * 그 이미지에서 dominant 색을 뽑아 brandColor도 같이 자동 등록.
 *
 * - 이미 imageUrl 채워진 컨퍼런스는 skip (운영자 수동 등록 우선)
 * - fetch 실패 시 graceful (brand 색 fallback으로 자연 처리)
 * - brandColor가 시드에 있으면 보존, 없으면 자동 추출
 */
@Injectable()
export class ConferenceImageSyncService {
  private readonly logger = new Logger(ConferenceImageSyncService.name);

  constructor(
    private prisma: PrismaService,
    private og: OgImageService,
    private brand: BrandColorService,
  ) {}

  /** imageUrl 없는 컨퍼런스 전부 sync. force=true 면 기존 값도 갱신. */
  async syncAll(opts: { force?: boolean } = {}): Promise<{
    total: number;
    updated: number;
    failed: number;
    brandExtracted: number;
  }> {
    const where = opts.force ? {} : { imageUrl: null };
    const targets = await this.prisma.conference.findMany({ where });

    let updated = 0;
    let failed = 0;
    let brandExtracted = 0;

    for (const c of targets) {
      try {
        const image = await this.og.fetch(c.url);
        if (!image) {
          failed++;
          this.logger.debug(`[${c.name}] og:image 없음`);
          continue;
        }

        // brand 색은 기존 값 보존, 없을 때만 자동 추출
        let nextBrand = c.brandColor;
        if (!nextBrand || opts.force) {
          const extracted = await this.brand.extractFromUrl(image);
          if (extracted) {
            nextBrand = extracted;
            brandExtracted++;
            this.logger.log(`[${c.name}] brand 자동 추출 → ${extracted}`);
          }
        }

        await this.prisma.conference.update({
          where: { id: c.id },
          data: { imageUrl: image, brandColor: nextBrand },
        });
        updated++;
        this.logger.log(`[${c.name}] image 자동 등록 → ${image}`);
      } catch (e) {
        failed++;
        this.logger.warn(`[${c.name}] sync 실패: ${(e as Error).message}`);
      }
    }

    return { total: targets.length, updated, failed, brandExtracted };
  }
}
