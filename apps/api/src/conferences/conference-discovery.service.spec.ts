import { Test } from '@nestjs/testing';
import { ConferenceDiscoveryService } from './conference-discovery.service';
import { AnthropicService } from '../ai/anthropic.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ConferenceDiscoveryService', () => {
  let service: ConferenceDiscoveryService;
  let prisma: {
    article: { findMany: jest.Mock };
    conference: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let anthropic: { client: { messages: { create: jest.Mock } } };

  beforeEach(async () => {
    prisma = {
      article: { findMany: jest.fn() },
      conference: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    anthropic = { client: { messages: { create: jest.fn() } } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConferenceDiscoveryService,
        { provide: AnthropicService, useValue: anthropic },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ConferenceDiscoveryService);
  });

  function mockNerResponse(payload: object) {
    anthropic.client.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
    });
  }

  describe('extractFromArticle', () => {
    it('Haiku 응답에서 conferences 배열 파싱', async () => {
      mockNerResponse({
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

    it('빈 conferences 응답은 빈 배열', async () => {
      mockNerResponse({ conferences: [] });
      const result = await service.extractFromArticle({
        id: 'a1',
        title: '...',
        snippet: '...',
      });
      expect(result).toEqual([]);
    });

    it('JSON 파싱 실패 시 빈 배열 (throw X)', async () => {
      anthropic.client.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'not json' }],
      });
      const result = await service.extractFromArticle({
        id: 'a1',
        title: '...',
        snippet: '...',
      });
      expect(result).toEqual([]);
    });

    it('text가 아닌 block은 무시', async () => {
      anthropic.client.messages.create.mockResolvedValue({
        content: [
          { type: 'tool_use', name: 'x' },
          { type: 'text', text: '{"conferences":[]}' },
        ],
      });
      const result = await service.extractFromArticle({
        id: 'a1',
        title: '...',
        snippet: '...',
      });
      expect(result).toEqual([]);
    });
  });

  describe('saveProposals', () => {
    it('URL 있고 신규면 PROPOSED로 create', async () => {
      prisma.conference.findUnique.mockResolvedValue(null);
      prisma.conference.create.mockResolvedValue({ id: 'c1' });

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
      expect(prisma.conference.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'KubeCon 2026',
          url: 'https://kubecon.io/2026',
          status: 'PROPOSED',
          discoveredFromArticleId: 'art-1',
        }),
      });
    });

    it('이미 등록된 URL은 skip', async () => {
      prisma.conference.findUnique.mockResolvedValue({ id: 'existing' });

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

    it('URL 없으면 name+startDate dedupe + placeholder URL로 저장', async () => {
      prisma.conference.findFirst.mockResolvedValue(null);
      prisma.conference.create.mockResolvedValue({ id: 'c1' });

      const result = await service.saveProposals(
        [
          {
            name: 'Some Meetup 2026',
            url: null,
            startDate: '2026-12-01',
            endDate: null,
            location: null,
            topics: [],
          },
        ],
        'art-1',
      );

      expect(result.saved).toBe(1);
      const createArgs = prisma.conference.create.mock.calls[0][0];
      expect(createArgs.data.url).toMatch(/^proposed:\/\//);
      expect(createArgs.data.status).toBe('PROPOSED');
    });

    it('URL 없는 동일 이름+날짜 중복은 skip', async () => {
      prisma.conference.findFirst.mockResolvedValue({ id: 'dup' });

      const result = await service.saveProposals(
        [
          {
            name: 'X',
            url: null,
            startDate: '2026-12-01',
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

  describe('discoverFromRecentArticles', () => {
    it('키워드 매치된 글 → NER → saveProposals 흐름', async () => {
      prisma.article.findMany.mockResolvedValue([
        {
          id: 'art-1',
          title: 'KubeCon 2026 일정',
          summaryThreeLine: 'KubeCon 2026이 서울에서 열립니다.',
          summaryOneLine: null,
        },
      ]);
      mockNerResponse({
        conferences: [
          {
            name: 'KubeCon 2026',
            url: 'https://kubecon.io',
            startDate: '2026-11-10',
            endDate: null,
            location: '서울',
            topics: ['k8s'],
          },
        ],
      });
      prisma.conference.findUnique.mockResolvedValue(null);
      prisma.conference.create.mockResolvedValue({ id: 'c1' });

      const result = await service.discoverFromRecentArticles();

      expect(result.scannedArticles).toBe(1);
      expect(result.llmCalls).toBe(1);
      expect(result.proposed).toBe(1);
    });

    it('LLM 실패해도 다음 글 진행', async () => {
      prisma.article.findMany.mockResolvedValue([
        { id: 'a1', title: 'fail', summaryThreeLine: null, summaryOneLine: null },
        { id: 'a2', title: 'ok', summaryThreeLine: null, summaryOneLine: null },
      ]);
      anthropic.client.messages.create
        .mockRejectedValueOnce(new Error('API down'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{"conferences":[]}' }],
        });

      const result = await service.discoverFromRecentArticles();
      expect(result.scannedArticles).toBe(2);
      // 첫 글은 throw 잡고, 두 번째는 정상
      expect(result.llmCalls).toBeGreaterThanOrEqual(1);
    });
  });
});
