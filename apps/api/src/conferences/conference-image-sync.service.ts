import { Injectable, Logger } from '@nestjs/common';
import { BrandColorService } from '../common/brand-color.service';
import { OgImageService } from '../common/og-image.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 컨퍼런스 자동 이미지 동기화 + brand 색 추출.
 * 이미지/브랜드색 비어 있는 ACTIVE 컨퍼런스의 공식 URL에서 og:image 추출 후,
 * 그 이미지에서 dominant 색을 뽑아 brandColor도 같이 자동 등록.
 *
 * - 이미 imageUrl 채워진 컨퍼런스는 og fetch 없이 그 이미지를 brand 소스로 사용 (운영자 수동 등록 우선)
 * - REJECTED/PROPOSED 후보는 비-force 대상에서 제외 (외부 낭비 fetch 방지)
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

  /**
   * 이미지/브랜드색 비어 있는 ACTIVE 컨퍼런스 sync. force=true 면 상태 무관 전체 재갱신.
   * 비-force 는 status ACTIVE 로 한정 — REJECTED/PROPOSED 후보의 외부 URL 로
   * 부팅·approve 때마다 낭비 fetch 하지 않는다.
   */
  async syncAll(
    opts: { force?: boolean; limit?: number; concurrency?: number; imagesOnly?: boolean } = {},
  ): Promise<{
    total: number;
    updated: number;
    failed: number;
    brandExtracted: number;
    writeFailed: number;
  }> {
    const where = opts.force
      ? {}
      : {
          status: 'ACTIVE',
          ...(opts.imagesOnly
            ? { imageUrl: null }
            : { OR: [{ imageUrl: null }, { brandColor: null }] }),
        };
    const targets = await this.prisma.conference.findMany({
      where,
      ...(opts.limit
        ? {
            take: Math.min(Math.max(Math.floor(opts.limit), 1), 1000),
            orderBy: { startDate: 'asc' as const },
          }
        : {}),
    });

    let updated = 0;
    let failed = 0;
    let brandExtracted = 0;

    let writeFailed = 0;
    let cursor = 0;
    const worker = async () => {
      while (cursor < targets.length) {
        const c = targets[cursor++];
        try {
          // imageUrl 이 이미 있으면(운영자 수동 등록) 그대로 브랜드색 소스로 사용 — og fetch 생략 + 덮어쓰기 방지
          const image = !opts.force && c.imageUrl ? c.imageUrl : await this.og.fetch(c.url);
          if (!image) {
            failed++;
            this.logger.debug(`[${c.name}] og:image 없음`);
            continue;
          }

          // brand 색은 기존 값 보존, 없을 때만 자동 추출
          let nextBrand = c.brandColor;
          if (!opts.imagesOnly && (!nextBrand || opts.force)) {
            const extracted = await this.brand.extractFromUrl(image);
            if (extracted) {
              nextBrand = extracted;
              brandExtracted++;
              this.logger.log(`[${c.name}] brand 자동 추출 → ${extracted}`);
            }
          }

          try {
            await this.prisma.conference.update({
              where: { id: c.id },
              data: { imageUrl: image, brandColor: nextBrand },
            });
          } catch (error) {
            writeFailed++;
            throw error;
          }
          updated++;
          this.logger.log(`[${c.name}] image 자동 등록 → ${image}`);
        } catch (e) {
          failed++;
          this.logger.warn(`[${c.name}] sync 실패: ${(e as Error).message}`);
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(Math.max(Math.floor(opts.concurrency ?? 1), 1), 6) }, () =>
        worker(),
      ),
    );
    return { total: targets.length, updated, failed, brandExtracted, writeFailed };
  }
}
