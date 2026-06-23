import { Test } from '@nestjs/testing';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { DailyDigestService } from './daily-digest.service';

describe('DailyDigestService', () => {
  let service: DailyDigestService;
  let prisma: {
    dailyDigest: { findUnique: jest.Mock };
    article: { findMany: jest.Mock };
  };
  let gemini: { isAvailable: jest.Mock; generateJson: jest.Mock };

  beforeEach(async () => {
    prisma = {
      dailyDigest: { findUnique: jest.fn().mockResolvedValue(null) },
      article: { findMany: jest.fn() },
    };
    gemini = {
      isAvailable: jest.fn().mockReturnValue(false),
      generateJson: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DailyDigestService,
        { provide: GeminiService, useValue: gemini },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(DailyDigestService);
  });

  describe('dayStart (KST 경계)', () => {
    // getForDate → dayStart(date) → findUnique({ where: { date } }) 로 경계값을 관찰
    const dayStartFor = async (iso: string): Promise<Date> => {
      await service.getForDate(new Date(iso));
      const arg = prisma.dailyDigest.findUnique.mock.calls.at(-1)?.[0] as {
        where: { date: Date };
      };
      return arg.where.date;
    };

    it('KST 자정의 UTC 순간을 반환 (UTC 전날 15:00)', async () => {
      // 2026-06-23 00:30 KST = 2026-06-22 15:30 UTC
      const day = await dayStartFor('2026-06-22T15:30:00Z');
      // KST 2026-06-23 00:00 = UTC 2026-06-22 15:00
      expect(day.toISOString()).toBe('2026-06-22T15:00:00.000Z');
    });

    it('크론 09:30 KST 시점에도 같은 날 경계로 묶인다', async () => {
      // 09:30 KST = 00:30 UTC 같은 날
      const day = await dayStartFor('2026-06-23T00:30:00Z');
      expect(day.toISOString()).toBe('2026-06-22T15:00:00.000Z');
    });

    it('UTC 자정 직후(00:10 UTC)도 KST 기준 같은 날로 묶여 경계가 어긋나지 않는다', async () => {
      // 00:10 UTC = 09:10 KST → KST 2026-06-23
      const day = await dayStartFor('2026-06-23T00:10:00Z');
      expect(day.toISOString()).toBe('2026-06-22T15:00:00.000Z');
    });
  });
});
