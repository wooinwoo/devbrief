import { Test } from '@nestjs/testing';
import { BrandColorService } from '../common/brand-color.service';
import { OgImageService } from '../common/og-image.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConferenceImageSyncService } from './conference-image-sync.service';

describe('ConferenceImageSyncService', () => {
  let service: ConferenceImageSyncService;
  let prisma: {
    conference: { findMany: jest.Mock; update: jest.Mock };
  };
  let og: { fetch: jest.Mock };
  let brand: { extractFromUrl: jest.Mock };

  beforeEach(async () => {
    prisma = {
      conference: { findMany: jest.fn(), update: jest.fn() },
    };
    og = { fetch: jest.fn() };
    brand = { extractFromUrl: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConferenceImageSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: OgImageService, useValue: og },
        { provide: BrandColorService, useValue: brand },
      ],
    }).compile();

    service = moduleRef.get(ConferenceImageSyncService);
  });

  it('force=false 는 ACTIVE + 이미지/브랜드색 비어 있는 행만 대상 (REJECTED/PROPOSED 제외)', async () => {
    prisma.conference.findMany.mockResolvedValue([]);
    await service.syncAll();
    expect(prisma.conference.findMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        OR: [{ imageUrl: null }, { brandColor: null }],
      },
    });
  });

  it('force=true 면 전부 대상', async () => {
    prisma.conference.findMany.mockResolvedValue([]);
    await service.syncAll({ force: true });
    expect(prisma.conference.findMany).toHaveBeenCalledWith({ where: {} });
  });

  it('og:image fetch 성공 + 시드 brandColor 보존 (자동 추출 skip)', async () => {
    prisma.conference.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'FECONF',
        url: 'https://feconf.kr',
        brandColor: 'oklch(50% 0.2 245)',
      },
    ]);
    og.fetch.mockResolvedValue('https://feconf.kr/og.jpg');

    const result = await service.syncAll();

    expect(og.fetch).toHaveBeenCalledWith('https://feconf.kr');
    expect(brand.extractFromUrl).not.toHaveBeenCalled();
    expect(prisma.conference.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        imageUrl: 'https://feconf.kr/og.jpg',
        brandColor: 'oklch(50% 0.2 245)',
      },
    });
    expect(result).toEqual({
      total: 1,
      updated: 1,
      failed: 0,
      brandExtracted: 0,
      writeFailed: 0,
    });
  });

  it('brandColor 없으면 자동 추출 → 같이 저장', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'NewConf', url: 'https://new', brandColor: null },
    ]);
    og.fetch.mockResolvedValue('https://new/og.jpg');
    brand.extractFromUrl.mockResolvedValue('oklch(60% 0.22 30)');

    const result = await service.syncAll();

    expect(brand.extractFromUrl).toHaveBeenCalledWith('https://new/og.jpg');
    expect(prisma.conference.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        imageUrl: 'https://new/og.jpg',
        brandColor: 'oklch(60% 0.22 30)',
      },
    });
    expect(result.brandExtracted).toBe(1);
  });

  it('force=true 면 기존 brandColor도 재추출', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'X', url: 'https://x', brandColor: 'oklch(0% 0 0)' },
    ]);
    og.fetch.mockResolvedValue('https://x/og.jpg');
    brand.extractFromUrl.mockResolvedValue('oklch(70% 0.3 150)');

    await service.syncAll({ force: true });
    expect(brand.extractFromUrl).toHaveBeenCalled();
    const updateData = prisma.conference.update.mock.calls[0][0].data;
    expect(updateData.brandColor).toBe('oklch(70% 0.3 150)');
  });

  it('imageUrl 이미 있으면 og fetch 없이 그 이미지로 brand 추출, imageUrl 보존', async () => {
    prisma.conference.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'ManualConf',
        url: 'https://manual',
        imageUrl: 'https://manual/hand-registered.png',
        brandColor: null,
      },
    ]);
    brand.extractFromUrl.mockResolvedValue('oklch(55% 0.2 200)');

    const result = await service.syncAll();

    // 운영자 수동 등록 imageUrl 을 덮어쓰지 않고 브랜드색 소스로만 사용
    expect(og.fetch).not.toHaveBeenCalled();
    expect(brand.extractFromUrl).toHaveBeenCalledWith('https://manual/hand-registered.png');
    expect(prisma.conference.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        imageUrl: 'https://manual/hand-registered.png',
        brandColor: 'oklch(55% 0.2 200)',
      },
    });
    expect(result).toEqual({
      total: 1,
      updated: 1,
      failed: 0,
      brandExtracted: 1,
      writeFailed: 0,
    });
  });

  it('brand 추출 실패 시 기존 brandColor 유지', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'X', url: 'https://x', brandColor: null },
    ]);
    og.fetch.mockResolvedValue('https://x/og.jpg');
    brand.extractFromUrl.mockResolvedValue(null);

    const result = await service.syncAll();
    const updateData = prisma.conference.update.mock.calls[0][0].data;
    expect(updateData.brandColor).toBeNull();
    expect(result.brandExtracted).toBe(0);
  });

  it('og:image null이면 failed 카운트, update 호출 X', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'FECONF', url: 'https://feconf.kr' },
    ]);
    og.fetch.mockResolvedValue(null);

    const result = await service.syncAll();

    expect(prisma.conference.update).not.toHaveBeenCalled();
    expect(brand.extractFromUrl).not.toHaveBeenCalled();
    expect(result).toEqual({
      total: 1,
      updated: 0,
      failed: 1,
      brandExtracted: 0,
      writeFailed: 0,
    });
  });

  it('하나 실패해도 다음 진행', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'down', url: 'https://down', brandColor: 'X' },
      { id: 'c2', name: 'ok', url: 'https://ok', brandColor: 'Y' },
    ]);
    og.fetch
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValueOnce('https://ok/og.png');

    const result = await service.syncAll();

    expect(prisma.conference.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      total: 2,
      updated: 1,
      failed: 1,
      brandExtracted: 0,
      writeFailed: 0,
    });
  });

  it('image-only backfill requests a bounded batch and avoids expensive color downloads', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'Event', url: 'https://event.test', imageUrl: null, brandColor: null },
    ]);
    og.fetch.mockResolvedValue('https://event.test/poster.png');
    const result = await service.syncAll({ imagesOnly: true, limit: 1000, concurrency: 6 });
    expect(prisma.conference.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', imageUrl: null },
      take: 1000,
      orderBy: { startDate: 'asc' },
    });
    expect(brand.extractFromUrl).not.toHaveBeenCalled();
    expect(result).toMatchObject({ updated: 1, writeFailed: 0 });
  });
  it('distinguishes DB failures from unavailable image metadata', async () => {
    prisma.conference.findMany.mockResolvedValue([
      { id: 'c1', name: 'Event', url: 'https://event.test' },
    ]);
    og.fetch.mockResolvedValue('https://event.test/poster.png');
    prisma.conference.update.mockRejectedValue(new Error('database down'));
    expect(await service.syncAll({ imagesOnly: true })).toMatchObject({
      updated: 0,
      failed: 1,
      writeFailed: 1,
    });
  });
});
