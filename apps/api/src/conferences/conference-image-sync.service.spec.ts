import { Test } from '@nestjs/testing';
import { ConferenceImageSyncService } from './conference-image-sync.service';
import { OgImageService } from '../common/og-image.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ConferenceImageSyncService', () => {
  let service: ConferenceImageSyncService;
  let prisma: {
    conference: { findMany: jest.Mock; update: jest.Mock };
  };
  let og: { fetch: jest.Mock };

  beforeEach(async () => {
    prisma = {
      conference: { findMany: jest.fn(), update: jest.fn() },
    };
    og = { fetch: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConferenceImageSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: OgImageService, useValue: og },
      ],
    }).compile();

    service = moduleRef.get(ConferenceImageSyncService);
  });

  it('imageUrl null인 컨퍼런스만 sync 대상으로 조회 (force=false)', async () => {
    prisma.conference.findMany.mockResolvedValue([]);
    await service.syncAll();
    expect(prisma.conference.findMany).toHaveBeenCalledWith({
      where: { imageUrl: null },
    });
  });

  it('force=true 면 전부 대상', async () => {
    prisma.conference.findMany.mockResolvedValue([]);
    await service.syncAll({ force: true });
    expect(prisma.conference.findMany).toHaveBeenCalledWith({ where: {} });
  });

  it('og:image fetch 성공 시 imageUrl 업데이트', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'FECONF', url: 'https://feconf.kr' },
    ]);
    og.fetch.mockResolvedValue('https://feconf.kr/og.jpg');

    const result = await service.syncAll();

    expect(og.fetch).toHaveBeenCalledWith('https://feconf.kr');
    expect(prisma.conference.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { imageUrl: 'https://feconf.kr/og.jpg' },
    });
    expect(result).toEqual({ total: 1, updated: 1, failed: 0 });
  });

  it('og:image null이면 failed 카운트, update 호출 X', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'FECONF', url: 'https://feconf.kr' },
    ]);
    og.fetch.mockResolvedValue(null);

    const result = await service.syncAll();

    expect(prisma.conference.update).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 1, updated: 0, failed: 1 });
  });

  it('하나 실패해도 다음 진행 (error throw)', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'down', url: 'https://down' },
      { id: 'c2', name: 'ok', url: 'https://ok' },
    ]);
    og.fetch
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValueOnce('https://ok/og.png');

    const result = await service.syncAll();

    expect(prisma.conference.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ total: 2, updated: 1, failed: 1 });
  });
});
