import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { IngestionService } from './ingestion.service';
import { RssParserService } from './rss-parser.service';
import { PrismaService } from '../prisma/prisma.service';

describe('IngestionService', () => {
  let service: IngestionService;
  let prisma: jest.Mocked<PrismaService>;
  let rss: jest.Mocked<RssParserService>;
  let summarizationQueue: { add: jest.Mock };
  let embeddingQueue: { add: jest.Mock };

  beforeEach(async () => {
    summarizationQueue = { add: jest.fn() };
    embeddingQueue = { add: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: PrismaService,
          useValue: {
            source: { findMany: jest.fn() },
            article: { findUnique: jest.fn(), create: jest.fn() },
          },
        },
        {
          provide: RssParserService,
          useValue: {
            parse: jest.fn(),
            resolveImageUrl: jest.fn(),
          },
        },
        { provide: getQueueToken('summarization'), useValue: summarizationQueue },
        { provide: getQueueToken('embedding'), useValue: embeddingQueue },
      ],
    }).compile();

    service = moduleRef.get(IngestionService);
    prisma = moduleRef.get(PrismaService);
    rss = moduleRef.get(RssParserService);
  });

  describe('ingestSource', () => {
    it('새 글 1개 저장 + 요약/임베딩 큐 push', async () => {
      rss.parse.mockResolvedValue({
        items: [
          {
            title: 'New article',
            link: 'https://example.com/a',
            isoDate: '2026-05-30T00:00:00Z',
            categories: ['AI'],
            'content:encoded': '<p>본문</p>',
          },
        ],
      } as never);
      (prisma.article.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-1',
        title: 'New article',
      });
      rss.resolveImageUrl.mockResolvedValue('https://img.com/x.png');

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(1);
      expect(prisma.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceId: 'src-1',
          title: 'New article',
          url: 'https://example.com/a',
          imageUrl: 'https://img.com/x.png',
        }),
      });
      expect(summarizationQueue.add).toHaveBeenCalledWith(
        'summarize',
        expect.objectContaining({ articleId: 'art-1' }),
        // 한도/장애 대비 지수 backoff 재시도 정책이 함께 적재된다
        expect.objectContaining({ attempts: 6 }),
      );
      expect(embeddingQueue.add).toHaveBeenCalledWith(
        'embed',
        expect.objectContaining({ articleId: 'art-1' }),
      );
    });

    it('이미 존재하는 url은 skip (중복 저장 X)', async () => {
      rss.parse.mockResolvedValue({
        items: [{ title: 'dup', link: 'https://example.com/dup' }],
      } as never);
      (prisma.article.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing',
      });

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(0);
      expect(prisma.article.create).not.toHaveBeenCalled();
      expect(summarizationQueue.add).not.toHaveBeenCalled();
    });

    it('title 또는 link 없는 item은 skip', async () => {
      rss.parse.mockResolvedValue({
        items: [
          { title: '제목만 있고 링크 없음' },
          { link: 'https://example.com/x' }, // title 없음
        ],
      } as never);

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(0);
      expect(prisma.article.create).not.toHaveBeenCalled();
    });

    it('500자 초과 title은 잘라서 저장', async () => {
      const longTitle = 'A'.repeat(800);
      rss.parse.mockResolvedValue({
        items: [{ title: longTitle, link: 'https://example.com/long' }],
      } as never);
      (prisma.article.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.article.create as jest.Mock).mockResolvedValue({ id: 'art-2' });
      rss.resolveImageUrl.mockResolvedValue(null);

      await service.ingestSource('src-1', 'https://feed.com/rss');

      const callArg = (prisma.article.create as jest.Mock).mock.calls[0][0];
      expect(callArg.data.title.length).toBeLessThanOrEqual(500);
    });

    it('isoDate 없으면 현재 시각으로 fallback', async () => {
      rss.parse.mockResolvedValue({
        items: [{ title: 'no-date', link: 'https://example.com/nd' }],
      } as never);
      (prisma.article.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.article.create as jest.Mock).mockResolvedValue({ id: 'art-3' });
      rss.resolveImageUrl.mockResolvedValue(null);

      const before = Date.now();
      await service.ingestSource('src-1', 'https://feed.com/rss');
      const after = Date.now();

      const callArg = (prisma.article.create as jest.Mock).mock.calls[0][0];
      const ts = callArg.data.publishedAt.getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('ingestAll', () => {
    it('모든 active source에 대해 ingestSource 호출, 합계 반환', async () => {
      (prisma.source.findMany as jest.Mock).mockResolvedValue([
        { id: 's1', name: 'A', feedUrl: 'https://a' },
        { id: 's2', name: 'B', feedUrl: 'https://b' },
      ]);
      jest
        .spyOn(service, 'ingestSource')
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5);

      const result = await service.ingestAll();
      expect(result).toEqual({ sourceCount: 2, newArticles: 8 });
    });

    it('source 하나 실패해도 다음 진행', async () => {
      (prisma.source.findMany as jest.Mock).mockResolvedValue([
        { id: 's1', name: 'fail', feedUrl: 'https://fail' },
        { id: 's2', name: 'ok', feedUrl: 'https://ok' },
      ]);
      jest
        .spyOn(service, 'ingestSource')
        .mockRejectedValueOnce(new Error('RSS down'))
        .mockResolvedValueOnce(2);

      const result = await service.ingestAll();
      expect(result).toEqual({ sourceCount: 2, newArticles: 2 });
    });
  });
});
