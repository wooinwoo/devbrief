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
    // slash-26 미개설(404) → 최근 SLASH 페이지. 26 열리면 교체
    url: 'https://toss.im/slash-24',
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
        await this.prisma.conference.upsert({
          where: { url: seed.url },
          create: {
            ...seed,
            startDate: new Date(seed.startDate),
            endDate: seed.endDate ? new Date(seed.endDate) : null,
          },
          // update에서 imageUrl 빼서 자동 sync된 값을 보존
          update: {
            name: seed.name,
            location: seed.location,
            topics: seed.topics,
            description: seed.description,
            brandColor: seed.brandColor,
            youtubeChannelId: seed.youtubeChannelId,
          },
        });
      }
      this.logger.log(`Seeded ${SEEDS.length} conferences`);
    } catch (e) {
      this.logger.warn(`Conference seeding skipped: ${(e as Error).message}`);
      return;
    }

    // 백그라운드: imageUrl 비어 있는 컨퍼런스 og:image 자동 추출
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
}
