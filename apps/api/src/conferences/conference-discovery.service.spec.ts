import { Test } from '@nestjs/testing';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConferenceDiscoveryService } from './conference-discovery.service';

describe('ConferenceDiscoveryService', () => {
  let service: ConferenceDiscoveryService;
  let prisma: {
    article: { findMany: jest.Mock };
    conference: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
    };
  };
  let gemini: {
    isAvailable: jest.Mock;
    generateJson: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      article: { findMany: jest.fn() },
      conference: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    gemini = {
      isAvailable: jest.fn().mockReturnValue(true),
      generateJson: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConferenceDiscoveryService,
        { provide: GeminiService, useValue: gemini },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ConferenceDiscoveryService);
  });

  describe('extractFromArticle', () => {
    it('Gemini 응답에서 conferences 배열 파싱', async () => {
      gemini.generateJson.mockResolvedValue({
        conferences: [
          {
            name: 'KubeCon 2026',
            url: 'https://kubecon.io/2026',
            startDate: '2026-11-10',
            endDate: '2026-11-13',
            location: '서울',
            topics: ['Kubernetes'],
          },
        ],
      });

      const result = await service.extractFromArticle({
        id: 'a1',
        title: 'KubeCon 2026 일정 공개',
        snippet: '...',
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('KubeCon 2026');
    });

    it('Gemini 미설정 → 빈 배열', async () => {
      gemini.isAvailable.mockReturnValue(false);
      const result = await service.extractFromArticle({
        id: 'a1',
        title: 't',
        snippet: 's',
      });
      expect(result).toEqual([]);
      expect(gemini.generateJson).not.toHaveBeenCalled();
    });

    it('빈 conferences 응답은 빈 배열', async () => {
      gemini.generateJson.mockResolvedValue({ conferences: [] });
      const result = await service.extractFromArticle({
        id: 'a1',
        title: '...',
        snippet: '...',
      });
      expect(result).toEqual([]);
    });

    it('Gemini 에러는 빈 배열로 graceful', async () => {
      gemini.generateJson.mockRejectedValue(new Error('quota'));
      const result = await service.extractFromArticle({
        id: 'a1',
        title: 't',
        snippet: 's',
      });
      expect(result).toEqual([]);
    });
  });

  describe('saveProposals', () => {
    it('URL 있고 신규면 PROPOSED 로 createMany', async () => {
      prisma.conference.findMany.mockResolvedValue([]);
      prisma.conference.createMany.mockResolvedValue({ count: 1 });

      const result = await service.saveProposals(
        [
          {
            name: 'KubeCon 2026',
            url: 'https://kubecon.io/2026',
            startDate: '2026-11-10',
            endDate: null,
            location: '서울',
            topics: ['k8s'],
          },
        ],
        'art-1',
      );

      expect(result).toEqual({ saved: 1, skipped: 0 });
      expect(prisma.conference.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            name: 'KubeCon 2026',
            url: 'https://kubecon.io/2026',
            status: 'PROPOSED',
            discoveredFromArticleId: 'art-1',
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('이미 등록된 URL은 skip', async () => {
      prisma.conference.findMany.mockResolvedValue([{ url: 'https://feconf.kr' }]);
      const result = await service.saveProposals(
        [
          {
            name: 'FECONF 2026',
            url: 'https://feconf.kr',
            startDate: '2026-10-25',
            endDate: null,
            location: '서울',
            topics: [],
          },
        ],
        'art-1',
      );
      expect(result).toEqual({ saved: 0, skipped: 1 });
      expect(prisma.conference.create).not.toHaveBeenCalled();
    });

    it('startDate null인 후보는 skip', async () => {
      const result = await service.saveProposals(
        [
          {
            name: 'X',
            url: 'https://x',
            startDate: null,
            endDate: null,
            location: null,
            topics: [],
          },
        ],
        'art-1',
      );
      expect(result).toEqual({ saved: 0, skipped: 1 });
    });
  });
});
