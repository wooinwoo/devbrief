import { Test } from '@nestjs/testing';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { DailyDigestService } from './daily-digest.service';

describe('DailyDigestService', () => {
  let service: DailyDigestService;
  let prisma: {
    dailyDigest: { findUnique: jest.Mock; upsert: jest.Mock };
    article: { findMany: jest.Mock };
  };
  let gemini: { isAvailable: jest.Mock; generateJson: jest.Mock };

  beforeEach(async () => {
    prisma = {
      dailyDigest: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
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

  describe('generateForToday', () => {
    const article = (id: string, sourceName = 'GeekNews') => ({
      id,
      title: `Title ${id}`,
      titleKo: `제목 ${id}`,
      summaryOneLine: `요약 ${id}`,
      publishedAt: new Date(),
      tags: ['ai'],
      source: { name: sourceName },
    });

    it('기존 다이제스트가 있으면 { intro, items } shape 으로 반환한다 (bare 배열 금지)', async () => {
      const items = [{ articleId: 'a1', headline: 'h', takeaway: 't' }];
      prisma.dailyDigest.findUnique.mockResolvedValue({
        intro: '오늘의 인트로',
        items,
      });

      const result = await service.generateForToday();

      expect(result).toEqual({ intro: '오늘의 인트로', items });
      expect(Array.isArray(result)).toBe(false);
    });

    it('기존 다이제스트의 intro 가 null 이면 빈 문자열로 채운다', async () => {
      prisma.dailyDigest.findUnique.mockResolvedValue({
        intro: null,
        items: [],
      });
      const result = await service.generateForToday();
      expect(result).toEqual({ intro: '', items: [] });
    });

    it('Gemini 가 articleId 를 전부 잘못 에코하면 빈 다이제스트를 저장하지 않고 휴리스틱 폴백한다', async () => {
      const articles = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => article(id));
      prisma.article.findMany.mockResolvedValue(articles);
      gemini.isAvailable.mockReturnValue(true);
      // 모델이 id 를 변형해 에코 → validIds 필터로 전부 탈락하는 상황
      gemini.generateJson.mockResolvedValue({
        intro: '무효 인트로',
        items: [{ articleId: '존재하지-않는-id', headline: 'h', takeaway: 't' }],
      });

      const result = await service.generateForToday();

      // 휴리스틱 폴백 결과 — items 가 비지 않는다
      expect(result).not.toBeNull();
      expect(result?.items.length).toBeGreaterThan(0);
      expect(result?.items.every((it) => articles.some((a) => a.id === it.articleId))).toBe(true);
      // 빈 items 는 한 번도 저장되지 않는다 (upsert 는 휴리스틱 1회뿐)
      expect(prisma.dailyDigest.upsert).toHaveBeenCalledTimes(1);
      const saved = prisma.dailyDigest.upsert.mock.calls[0][0];
      expect(saved.create.items.length).toBeGreaterThan(0);
    });

    it('Gemini 가 유효한 articleId 를 돌려주면 그대로 저장한다', async () => {
      const articles = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => article(id));
      prisma.article.findMany.mockResolvedValue(articles);
      gemini.isAvailable.mockReturnValue(true);
      gemini.generateJson.mockResolvedValue({
        intro: '정상 인트로',
        items: [{ articleId: 'a1', headline: 'h1', takeaway: 't1' }],
      });

      const result = await service.generateForToday();

      expect(result).toEqual({
        intro: '정상 인트로',
        items: [{ articleId: 'a1', headline: 'h1', takeaway: 't1' }],
      });
      expect(prisma.dailyDigest.upsert).toHaveBeenCalledTimes(1);
    });
  });
});
