// youtubei.js 는 ESM이라 ts-jest 가 파싱하지 못한다. 테스트에선 ensureInnertube 를
// 직접 스텁하므로 실제 Innertube 는 불필요 — 모듈 자체를 mock 으로 대체.
jest.mock('youtubei.js', () => ({ Innertube: { create: jest.fn() } }));
// @google/genai 도 ESM — 생성자에서 import 되므로 함께 mock.
jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

import { Test } from '@nestjs/testing';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { VideoAnalyzerService } from './video-analyzer.service';

describe('VideoAnalyzerService.fetchAndStore', () => {
  let service: VideoAnalyzerService;
  let prisma: { video: { upsert: jest.Mock } };
  let gemini: { isAvailable: jest.Mock };

  const makeInnertube = (basicInfo: Record<string, unknown>) => ({
    getInfo: jest.fn().mockResolvedValue({ basic_info: basicInfo }),
  });

  beforeEach(async () => {
    prisma = {
      video: { upsert: jest.fn().mockResolvedValue({ id: 'v1', videoId: 'abcd1234efg' }) },
    };
    gemini = { isAvailable: jest.fn().mockReturnValue(false) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VideoAnalyzerService,
        { provide: GeminiService, useValue: gemini },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(VideoAnalyzerService);
  });

  const stubInnertube = (basicInfo: Record<string, unknown>) => {
    jest
      .spyOn(service as unknown as { ensureInnertube: () => Promise<unknown> }, 'ensureInnertube')
      .mockResolvedValue(makeInnertube(basicInfo) as never);
  };

  it('start_timestamp 가 있으면 실제 발행일을 publishedAt 으로 저장', async () => {
    const ts = new Date('2026-05-01T08:00:00Z');
    stubInnertube({ title: 'T', author: 'C', duration: 100, view_count: 9, start_timestamp: ts });

    await service.fetchAndStore('https://youtu.be/abcd1234efg');

    const arg = prisma.video.upsert.mock.calls[0][0];
    expect(arg.create.publishedAt.toISOString()).toBe(ts.toISOString());
  });

  it('start_timestamp 없으면 현재 시각으로 폴백', async () => {
    stubInnertube({ title: 'T', author: 'C', duration: 100, view_count: 9, start_timestamp: null });

    const before = Date.now();
    await service.fetchAndStore('https://youtu.be/abcd1234efg');
    const after = Date.now();

    const arg = prisma.video.upsert.mock.calls[0][0];
    const ms = arg.create.publishedAt.getTime();
    expect(ms).toBeGreaterThanOrEqual(before);
    expect(ms).toBeLessThanOrEqual(after);
  });

  it('upsert update 에는 publishedAt 을 포함하지 않아 기존 발행일을 보존', async () => {
    stubInnertube({
      title: 'T',
      author: 'C',
      duration: 100,
      view_count: 9,
      start_timestamp: new Date('2026-05-01T08:00:00Z'),
    });

    await service.fetchAndStore('https://youtu.be/abcd1234efg');

    const arg = prisma.video.upsert.mock.calls[0][0];
    expect(arg.update).not.toHaveProperty('publishedAt');
  });
});
