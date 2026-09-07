import { Test } from '@nestjs/testing';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConferenceDiscoveryService } from './conference-discovery.service';
import { ConferenceFeedService } from './conference-feed.service';

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
      update: jest.Mock;
    };
  };
  let feeds: { collect: jest.Mock };
  let gemini: {
    isAvailable: jest.Mock;
    generateJson: jest.Mock;
  };

  /** findMany 는 url in 조회와 name in 조회 두 번 불린다 — where 로 구분해 응답 분리 */
  const mockConferenceDb = (opts: {
    byUrl?: unknown[];
    byName?: unknown[];
  }) => {
    prisma.conference.findMany.mockImplementation((args: { where: Record<string, unknown> }) =>
      Promise.resolve(args.where.url ? (opts.byUrl ?? []) : (opts.byName ?? [])),
    );
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T00:00:00Z'));
    prisma = {
      article: { findMany: jest.fn() },
      conference: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
      },
    };
    gemini = {
      isAvailable: jest.fn().mockReturnValue(true),
      generateJson: jest.fn(),
    };

    feeds = { collect: jest.fn().mockResolvedValue([]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConferenceDiscoveryService,
        { provide: ConferenceFeedService, useValue: feeds },
        { provide: GeminiService, useValue: gemini },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ConferenceDiscoveryService);
  });

  afterEach(() => jest.useRealTimers());

  it('AI 키 없이 공개 피드를 저장하고 소스별 실패를 집계한다', async () => {
    gemini.isAvailable.mockReturnValue(false);
    feeds.collect.mockResolvedValue([
      {
        source: 'MLH',
        candidates: [
          {
            name: 'Hack Day',
            url: 'https://example.com/hack',
            startDate: '2026-10-01',
            endDate: null,
            location: null,
            topics: ['Hackathon'],
          },
        ],
        skipped: 0,
      },
      { source: 'Agenda', candidates: [], skipped: 0, error: 'timeout' },
    ]);
    prisma.conference.createMany.mockResolvedValue({ count: 1 });
    const result = await service.discover();
    expect(result).toEqual(expect.objectContaining({ proposed: 1, failedSources: 1, llmCalls: 0 }));
    expect(prisma.conference.createMany.mock.calls[0][0].data[0]).toEqual(
      expect.objectContaining({ status: 'PROPOSED', discoveredFromArticleId: null }),
    );
    expect(prisma.article.findMany).not.toHaveBeenCalled();
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

      expect(result).toEqual({ saved: 1, skipped: 0, failed: 0 });
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
      mockConferenceDb({
        byUrl: [{ url: 'https://feconf.kr' }],
        byName: [
          {
            id: 'c1',
            name: 'FECONF 2026',
            startDate: new Date('2026-10-25'),
            url: 'https://feconf.kr',
          },
        ],
      });
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
      expect(result).toEqual({ saved: 0, skipped: 1, failed: 0 });
      expect(prisma.conference.create).not.toHaveBeenCalled();
    });

    it('URL 없는 후보는 name+startDate 일괄 조회로 dedupe (findFirst N+1 없음)', async () => {
      // 기존 DB 에 같은 name+startDate 가 placeholder URL 로 이미 있음
      prisma.conference.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'DevFest Seoul',
          startDate: new Date('2026-11-15'),
          url: 'proposed://abc',
        },
      ]);

      const result = await service.saveProposals(
        [
          {
            name: 'DevFest Seoul',
            url: null,
            startDate: '2026-11-15',
            endDate: null,
            location: '서울',
            topics: [],
          },
        ],
        'art-1',
      );

      expect(result).toEqual({ saved: 0, skipped: 1, failed: 0 });
      // 개별 findFirst 호출이 없어야 한다 (N+1 제거)
      expect(prisma.conference.findFirst).not.toHaveBeenCalled();
      expect(prisma.conference.createMany).not.toHaveBeenCalled();
    });

    it('URL 없는 신규 후보는 placeholder URL 로 createMany', async () => {
      prisma.conference.findMany.mockResolvedValue([]);
      prisma.conference.createMany.mockResolvedValue({ count: 1 });

      const result = await service.saveProposals(
        [
          {
            name: 'New Meetup 2026',
            url: null,
            startDate: '2026-12-01',
            endDate: null,
            location: '온라인',
            topics: ['web'],
          },
        ],
        'art-2',
      );

      expect(result).toEqual({ saved: 1, skipped: 0, failed: 0 });
      expect(prisma.conference.findFirst).not.toHaveBeenCalled();
      const arg = prisma.conference.createMany.mock.calls[0][0] as {
        data: Array<{ name: string; url: string }>;
      };
      expect(arg.data[0].name).toBe('New Meetup 2026');
      expect(arg.data[0].url.startsWith('proposed://')).toBe(true);
    });

    it('같은 배치 내 동일 name+startDate URL 없는 후보 중복은 1건만 저장', async () => {
      prisma.conference.findMany.mockResolvedValue([]);
      prisma.conference.createMany.mockResolvedValue({ count: 1 });

      const candidate = {
        name: 'Dup Conf',
        url: null,
        startDate: '2026-09-09',
        endDate: null,
        location: '서울',
        topics: [],
      };
      const result = await service.saveProposals([candidate, { ...candidate }], 'art-3');

      expect(result).toEqual({ saved: 1, skipped: 1, failed: 0 });
      const arg = prisma.conference.createMany.mock.calls[0][0] as {
        data: unknown[];
      };
      expect(arg.data).toHaveLength(1);
    });

    it('URL 있는 후보도 같은 name+startDate 의 실제 URL 기존 행이 있으면 skip', async () => {
      // 기존 행은 실제 URL, 후보는 다른 URL 로 같은 행사 재추출 — 중복 create 금지
      mockConferenceDb({
        byName: [
          {
            id: 'c1',
            name: 'FooConf 2026',
            startDate: new Date('2026-10-10'),
            url: 'https://fooconf.io',
          },
        ],
      });

      const result = await service.saveProposals(
        [
          {
            name: 'FooConf 2026',
            url: 'https://fooconf.io/2026',
            startDate: '2026-10-10',
            endDate: null,
            location: '서울',
            topics: [],
          },
        ],
        'art-1',
      );

      expect(result).toEqual({ saved: 0, skipped: 1, failed: 0 });
      expect(prisma.conference.createMany).not.toHaveBeenCalled();
      expect(prisma.conference.update).not.toHaveBeenCalled();
    });

    it('placeholder 행과 같은 name+startDate 가 실제 URL 로 재추출되면 기존 행 url 승격 (중복 create X)', async () => {
      // 1차 run 이 URL 없이 저장한 placeholder 행이 2차 run 에서 실제 URL 과 함께 발견됨
      mockConferenceDb({
        byName: [
          {
            id: 'c1',
            name: 'FooConf 2026',
            startDate: new Date('2026-10-10'),
            url: 'proposed://123-abc',
          },
        ],
      });
      prisma.conference.update.mockResolvedValue({});

      const result = await service.saveProposals(
        [
          {
            name: 'FooConf 2026',
            url: 'https://fooconf.io',
            startDate: '2026-10-10',
            endDate: null,
            location: '서울',
            topics: [],
          },
        ],
        'art-2',
      );

      expect(result).toEqual({ saved: 1, skipped: 0, failed: 0 });
      expect(prisma.conference.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { url: 'https://fooconf.io' },
      });
      expect(prisma.conference.createMany).not.toHaveBeenCalled();
    });

    it('같은 배치 내 URL 있는 후보와 URL 없는 동일 name+startDate 후보는 1건만 저장', async () => {
      prisma.conference.findMany.mockResolvedValue([]);
      prisma.conference.createMany.mockResolvedValue({ count: 1 });

      const result = await service.saveProposals(
        [
          {
            name: 'BarConf 2026',
            url: 'https://barconf.io',
            startDate: '2026-09-09',
            endDate: null,
            location: '서울',
            topics: [],
          },
          {
            name: 'BarConf 2026',
            url: null,
            startDate: '2026-09-09',
            endDate: null,
            location: '서울',
            topics: [],
          },
        ],
        'art-3',
      );

      expect(result).toEqual({ saved: 1, skipped: 1, failed: 0 });
      const arg = prisma.conference.createMany.mock.calls[0][0] as {
        data: Array<{ url: string }>;
      };
      expect(arg.data).toHaveLength(1);
      expect(arg.data[0].url).toBe('https://barconf.io');
    });

    it('URL 미상 후보 뒤에 실제 URL이 와도 같은 배치의 한 행으로 합친다', async () => {
      prisma.conference.createMany.mockResolvedValue({ count: 1 });
      const row = {
        name: 'Hack Day',
        url: null,
        startDate: '2026-10-10',
        endDate: null,
        location: null,
        topics: [],
      };
      expect(
        await service.saveProposals([row, { ...row, url: 'https://example.com/hack' }], null),
      ).toEqual({ saved: 1, skipped: 1, failed: 0 });
      expect(prisma.conference.createMany.mock.calls[0][0].data).toEqual([
        expect.objectContaining({ url: 'https://example.com/hack', discoveredFromArticleId: null }),
      ]);
    });

    it('DB 저장 실패를 중복 스킵으로 보고하지 않는다', async () => {
      prisma.conference.createMany.mockRejectedValue(new Error('database unavailable'));
      expect(
        await service.saveProposals(
          [
            {
              name: 'Hack Day',
              url: 'https://example.com/hack',
              startDate: '2026-10-10',
              endDate: null,
              location: null,
              topics: [],
            },
          ],
          null,
        ),
      ).toEqual({ saved: 0, skipped: 0, failed: 1 });
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
      expect(result).toEqual({ saved: 0, skipped: 1, failed: 0 });
    });
  });
  it('AI 키가 없으면 기사 조회와 LLM 호출을 건너뛴다', async () => {
    gemini.isAvailable.mockReturnValue(false);
    expect(await service.discoverFromRecentArticles()).toEqual({
      scannedArticles: 0,
      llmCalls: 0,
      proposed: 0,
      skipped: 0,
      failed: 0,
    });
    expect(prisma.article.findMany).not.toHaveBeenCalled();
  });

  it('AI 응답이 배열이 아니어도 오류 없이 제외한다', async () => {
    gemini.generateJson.mockResolvedValue({ conferences: { name: 'bad schema' } });
    expect(await service.extractFromArticle({ id: 'a1', title: 't', snippet: 's' })).toEqual([]);
  });
});
