import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ConferenceImageSyncService } from './conference-image-sync.service';
import { ConferenceSeederService } from './conference-seeder.service';

describe('ConferenceSeederService', () => {
  let service: ConferenceSeederService;
  let prisma: {
    conference: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let imageSync: { syncAll: jest.Mock };

  beforeEach(async () => {
    prisma = {
      conference: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    imageSync = {
      syncAll: jest.fn().mockResolvedValue({
        total: 0,
        updated: 0,
        failed: 0,
        brandExtracted: 0,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConferenceSeederService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConferenceImageSyncService, useValue: imageSync },
      ],
    }).compile();

    service = moduleRef.get(ConferenceSeederService);
  });

  it('기존 행이 없으면 시드 전부 create — SLASH 26 은 slash-26 URL', async () => {
    await service.onApplicationBootstrap();

    expect(prisma.conference.create).toHaveBeenCalledTimes(5);
    expect(prisma.conference.update).not.toHaveBeenCalled();

    const urls = prisma.conference.create.mock.calls.map(
      (call) => (call[0] as { data: { url: string } }).data.url,
    );
    // c41 회귀: slash-24 로 남아 있으면 안 됨
    expect(urls).toContain('https://toss.im/slash-26');
    expect(urls).not.toContain('https://toss.im/slash-24');
  });

  it('url 또는 name+startDate OR 로 기존 행을 조회한다 (url 정정에도 재매칭)', async () => {
    await service.onApplicationBootstrap();

    expect(prisma.conference.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { url: 'https://feconf.kr' },
          {
            AND: [{ name: 'FECONF 2026' }, { startDate: new Date('2026-10-25') }],
          },
        ],
      },
    });
  });

  it('기존 행이 있으면 비어 있는 필드만 채운다 — 운영자 편집·자동추출 값 보존', async () => {
    // 운영자가 url 을 slash-24 로 등록해 둔 기존 행 (name+startDate 로 매칭됨)
    // brandColor 는 force 이미지싱크가 자동 추출한 값, imageUrl 은 수동 등록 값
    const existing = {
      id: 'ex-slash',
      name: 'SLASH 26',
      url: 'https://toss.im/slash-24',
      startDate: new Date('2026-09-04'),
      endDate: null,
      location: '서울 / 그랜드워커힐',
      topics: ['Fintech'],
      description: null,
      imageUrl: 'https://cdn.example/slash.png',
      brandColor: 'oklch(70% 0.1 200)',
      youtubeChannelId: null,
      status: 'ACTIVE',
    };
    prisma.conference.findFirst.mockImplementation(
      (args: { where: { OR: Array<{ url?: string }> } }) =>
        Promise.resolve(args.where.OR[0].url === 'https://toss.im/slash-26' ? existing : null),
    );

    await service.onApplicationBootstrap();

    // SLASH 는 기존 행 매칭 → create 는 나머지 4개만
    expect(prisma.conference.create).toHaveBeenCalledTimes(4);
    const createdNames = prisma.conference.create.mock.calls.map(
      (call) => (call[0] as { data: { name: string } }).data.name,
    );
    expect(createdNames).not.toContain('SLASH 26'); // c40/c41 회귀: 중복 행 생성 X

    // 비어 있던 description/youtubeChannelId 만 채움 — url/brandColor/imageUrl 등은 건드리지 않음
    expect(prisma.conference.update).toHaveBeenCalledTimes(1);
    expect(prisma.conference.update).toHaveBeenCalledWith({
      where: { id: 'ex-slash' },
      data: {
        description: '토스 기술 컨퍼런스',
        youtubeChannelId: 'UCeg5g-vWgtgzQ0cYNV2Cyow',
      },
    });
  });

  it('모든 필드가 채워진 기존 행이면 update 를 호출하지 않는다', async () => {
    prisma.conference.findFirst.mockResolvedValue({
      id: 'full',
      name: 'X',
      url: 'https://x',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-02'),
      location: '서울',
      topics: ['a'],
      description: 'd',
      imageUrl: 'https://x/og.png',
      brandColor: 'oklch(50% 0.1 100)',
      youtubeChannelId: 'ch',
      status: 'ACTIVE',
    });

    await service.onApplicationBootstrap();

    expect(prisma.conference.create).not.toHaveBeenCalled();
    expect(prisma.conference.update).not.toHaveBeenCalled();
  });

  it('시드 후 imageSync.syncAll 을 fire-and-forget 트리거한다', async () => {
    await service.onApplicationBootstrap();
    expect(imageSync.syncAll).toHaveBeenCalledTimes(1);
  });

  it('시딩 실패 시 imageSync 를 트리거하지 않고 graceful 종료', async () => {
    prisma.conference.findFirst.mockRejectedValue(new Error('db down'));
    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(imageSync.syncAll).not.toHaveBeenCalled();
  });
});
