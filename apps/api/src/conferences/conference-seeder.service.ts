import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

// 기존 컨퍼런스 메타데이터. 신규 수집 후보는 discovery 경로에서 검토 대기로 저장한다.
// 키비주얼 URL은 각 컨퍼런스 공식 사이트의 og:image / 헤더 이미지 기준.
const SEEDS: ConfSeed[] = [
  {
    name: 'FECONF 2026',
    // 날짜·장소: https://www.linkedin.com/company/feconf/ (2026-09-08 확인)
    url: 'https://feconf.kr',
    startDate: '2026-10-24',
    location: '서울 롯데월드타워',
    topics: ['Frontend', 'React', 'TypeScript'],
    brandColor: 'oklch(48% 0.18 250)',
    description: '국내 최대 프론트엔드 컨퍼런스',
  },
  {
    name: 'if(kakao)dev 2026',
    url: 'https://if.kakao.com',
    startDate: '2026-10-13',
    endDate: '2026-10-14',
    location: '경기도 용인시 카카오 AI 캠퍼스',
    topics: ['Backend', 'AI', 'Infra'],
    brandColor: 'oklch(60% 0.18 90)',
    description: '카카오 기술 컨퍼런스',
    youtubeChannelId: 'UCdQF7F6hwjSpulj_fwB9iDQ',
  },
  {
    name: 'SLASH 26',
    url: 'https://toss.im/slash-26',
    startDate: '2026-09-04',
    location: '서울 / 그랜드워커힐',
    topics: ['Fintech', 'Backend', 'Mobile'],
    brandColor: 'oklch(50% 0.16 240)',
    description: '토스 기술 컨퍼런스',
    youtubeChannelId: 'UCeg5g-vWgtgzQ0cYNV2Cyow',
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

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.correctLegacySeeds();
      for (const seed of SEEDS) {
        await this.applySeed(seed);
      }
      this.logger.log(`Seeded ${SEEDS.length} conferences`);
    } catch (e) {
      this.logger.warn(`Conference seeding skipped: ${(e as Error).message}`);
      return;
    }

    // 이미지 수집은 GitHub Actions collect / conference-images CLI에서 실행한다.
    // 서빙 프로세스에서 디코딩을 시작하면 작은 인스턴스가 OOM으로 재시작하고,
    // 부팅마다 같은 수집을 반복하면서 모든 읽기 API까지 중단된다.
  }

  /** 잘못 배포된 시드와 모든 식별 필드가 일치할 때만 정정한다. 운영자 수정과 거절은 보존한다. */
  private async correctLegacySeeds() {
    const corrections = [
      {
        name: 'FECONF 2026',
        url: 'https://feconf.kr',
        startDate: new Date('2026-10-25'),
        endDate: null,
        location: '서울 / 광운대학교',
        data: { startDate: new Date('2026-10-24'), location: '서울 롯데월드타워' },
      },
      {
        name: 'if(kakao)dev 2026',
        url: 'https://if.kakao.com',
        startDate: new Date('2026-11-12'),
        endDate: new Date('2026-11-14'),
        location: '판교 / 카카오 본사',
        data: {
          startDate: new Date('2026-10-13'),
          endDate: new Date('2026-10-14'),
          location: '경기도 용인시 카카오 AI 캠퍼스',
        },
      },
      {
        // DEVIEW 공식 사이트는 DAN 2025로 이동한다. 미확인 2026 일정은 재검토한다.
        name: 'DEVIEW 2026',
        url: 'https://deview.kr',
        startDate: new Date('2026-11-26'),
        endDate: new Date('2026-11-27'),
        location: '서울 / 코엑스',
        data: { status: 'PROPOSED' as const },
      },
    ];
    for (const { data, ...legacy } of corrections) {
      await this.prisma.conference.updateMany({
        where: { ...legacy, status: 'ACTIVE', discoveredAt: null },
        data,
      });
    }
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
    const knownDates = [startDate];
    // URL을 운영자가 변경한 행도 날짜 정정 전 시드로 재매칭해 중복 생성을 막는다.
    if (seed.name === 'FECONF 2026') knownDates.push(new Date('2026-10-25'));
    if (seed.name === 'if(kakao)dev 2026') knownDates.push(new Date('2026-11-12'));
    const existing = await this.prisma.conference.findFirst({
      where: {
        OR: [{ url: seed.url }, { AND: [{ name: seed.name }, { startDate: { in: knownDates } }] }],
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
