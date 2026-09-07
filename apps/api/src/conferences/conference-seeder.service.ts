import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConferenceImageSyncService } from './conference-image-sync.service';

interface ConfSeed {
  name: string;
  url: string;
  startDate: string;
  endDate?: string;
  location: string;
  topics: string[];
  description?: string;
  imageUrl?: string;
  brandColor?: string;
  youtubeChannelId?: string;
}

// 시드용 한국 컨퍼런스 5개. 이미지는 운영자가 수동 등록한다는 전제.
// 키비주얼 URL은 각 컨퍼런스 공식 사이트의 og:image / 헤더 이미지 기준.
const SEEDS: ConfSeed[] = [
  {
    name: 'FECONF 2026',
    // 2026 서브도메인 미개설 → 공식 메인(차기 안내 리다이렉트). 2026.feconf.kr 열리면 교체
    url: 'https://feconf.kr',
    startDate: '2026-10-25',
    location: '서울 / 광운대학교',
    topics: ['Frontend', 'React', 'TypeScript'],
    brandColor: 'oklch(48% 0.18 250)',
    description: '국내 최대 프론트엔드 컨퍼런스',
  },
  {
    name: 'if(kakao)dev 2026',
    url: 'https://if.kakao.com',
    startDate: '2026-11-12',
    endDate: '2026-11-14',
    location: '판교 / 카카오 본사',
    topics: ['Backend', 'AI', 'Infra'],
    brandColor: 'oklch(60% 0.18 90)',
    description: '카카오 기술 컨퍼런스',
    youtubeChannelId: 'UCwLzlvJa4_LfHbcLbo0e7DA',
  },
  {
    name: 'SLASH 26',
    url: 'https://toss.im/slash-26',
    startDate: '2026-09-04',
    location: '서울 / 그랜드워커힐',
    topics: ['Fintech', 'Backend', 'Mobile'],
    brandColor: 'oklch(50% 0.16 240)',
    description: '토스 기술 컨퍼런스',
    youtubeChannelId: 'UChtY6O8Ahw2cz05PS2GhUbg',
  },
  {
    name: 'DEVIEW 2026',
    url: 'https://deview.kr',
    startDate: '2026-11-26',
    endDate: '2026-11-27',
    location: '서울 / 코엑스',
    topics: ['AI', 'Search', 'Cloud'],
    brandColor: 'oklch(52% 0.18 145)',
    description: 'NAVER 개발자 컨퍼런스',
    youtubeChannelId: 'UCvCikG-AvVl1nDjsdJ4w0pA',
  },
  {
    name: 'PyCon Korea 2026',
    url: 'https://2026.pycon.kr',
    startDate: '2026-08-15',
    endDate: '2026-08-17',
    location: '서울 / 동대문디자인플라자',
    topics: ['Python', 'Data', 'AI'],
    brandColor: 'oklch(55% 0.14 70)',
    description: '한국 파이썬 개발자 컨퍼런스',
  },
];

@Injectable()
export class ConferenceSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConferenceSeederService.name);

  constructor(
    private prisma: PrismaService,
    private imageSync: ConferenceImageSyncService,
  ) {}

  async onApplicationBootstrap() {
    try {
      for (const seed of SEEDS) {
        await this.applySeed(seed);
      }
      this.logger.log(`Seeded ${SEEDS.length} conferences`);
    } catch (e) {
      this.logger.warn(`Conference seeding skipped: ${(e as Error).message}`);
      return;
    }

    // 백그라운드: 이미지/브랜드색 비어 있는 ACTIVE 컨퍼런스 og:image 자동 추출
    // await 하지 않고 fire-and-forget — 부팅 차단 X
    this.imageSync
      .syncAll()
      .then((r) =>
        this.logger.log(
          `Conference image auto-sync: total=${r.total} updated=${r.updated} failed=${r.failed}`,
        ),
      )
      .catch((e) => this.logger.warn(`Conference image sync 실패: ${(e as Error).message}`));
  }

  /**
   * 시드 1건 반영. url 또는 name+startDate 로 기존 행을 찾고,
   * - 있으면 비어 있는(null) 필드만 시드값으로 채움 — 운영자 편집·자동 image sync 결과 보존
   * - 없으면 create
   * url 을 upsert 키로 쓰지 않으므로 시드 url 정정(예: slash-24 → slash-26)이나
   * 운영자의 DB url 수정에도 다음 부팅에서 중복 행이 생기지 않는다 (name+startDate 로 재매칭).
   */
  private async applySeed(seed: ConfSeed) {
    const startDate = new Date(seed.startDate);
    const existing = await this.prisma.conference.findFirst({
      where: {
        OR: [{ url: seed.url }, { AND: [{ name: seed.name }, { startDate }] }],
      },
    });

    if (!existing) {
      await this.prisma.conference.create({
        data: {
          ...seed,
          startDate,
          endDate: seed.endDate ? new Date(seed.endDate) : null,
        },
      });
      return;
    }

    // 비어 있는 필드만 시드로 채움. name/url/startDate/status 는 절대 덮어쓰지 않음
    // (force 이미지싱크의 brandColor 자동추출·운영자 DB 정정이 재배포에 유실되지 않게).
    const fill: Record<string, unknown> = {};
    if (!existing.endDate && seed.endDate) fill.endDate = new Date(seed.endDate);
    if (!existing.location && seed.location) fill.location = seed.location;
    if (!existing.topics?.length && seed.topics.length) fill.topics = seed.topics;
    if (!existing.description && seed.description) fill.description = seed.description;
    if (!existing.imageUrl && seed.imageUrl) fill.imageUrl = seed.imageUrl;
    if (!existing.brandColor && seed.brandColor) fill.brandColor = seed.brandColor;
    if (!existing.youtubeChannelId && seed.youtubeChannelId) {
      fill.youtubeChannelId = seed.youtubeChannelId;
    }

    if (Object.keys(fill).length > 0) {
      await this.prisma.conference.update({
        where: { id: existing.id },
        data: fill,
      });
    }
  }
}
