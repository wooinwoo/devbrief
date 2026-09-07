import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionService } from './ingestion.service';
import { RssParserService } from './rss-parser.service';

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
            source: { findMany: jest.fn(), update: jest.fn() },
            article: { findMany: jest.fn(), create: jest.fn() },
          },
        },
        {
          provide: RssParserService,
          useValue: {
            parse: jest.fn(),
            resolveImageUrl: jest.fn(),
          },
        },
        {
          provide: getQueueToken('summarization'),
          useValue: summarizationQueue,
        },
        { provide: getQueueToken('embedding'), useValue: embeddingQueue },
      ],
    }).compile();

    service = moduleRef.get(IngestionService);
    prisma = moduleRef.get(PrismaService);
    rss = moduleRef.get(RssParserService);
    (prisma.source.update as jest.Mock).mockResolvedValue({});
  });

  describe('ingestSource', () => {
    it('새 글 1개 저장 + 요약/임베딩 큐 push (결정적 jobId 로 멱등화)', async () => {
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
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
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
        // 한도/장애 대비 지수 backoff 재시도 + 동시 수집 경합 이중 적재 방지 jobId
        expect.objectContaining({ attempts: 6, jobId: 'summarize:art-1' }),
      );
      expect(embeddingQueue.add).toHaveBeenCalledWith(
        'embed',
        expect.objectContaining({ articleId: 'art-1' }),
        // embedding 큐도 summarization 과 동일한 재시도 정책 + jobId 적재
        expect.objectContaining({ attempts: 6, jobId: 'embed:art-1' }),
      );
    });

    it('이미 존재하는 url은 skip (중복 저장 X, 요약 있으면 재적재도 X)', async () => {
      rss.parse.mockResolvedValue({
        items: [{ title: 'dup', link: 'https://example.com/dup' }],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'a1',
          url: 'https://example.com/dup',
          title: 'dup',
          summaryOneLine: '요약 있음',
        },
      ]);

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(0);
      expect(prisma.article.create).not.toHaveBeenCalled();
      expect(summarizationQueue.add).not.toHaveBeenCalled();
    });

    it('중복 skip 글이라도 summaryOneLine null 이면 요약/임베딩 잡 재적재 (고아 복구)', async () => {
      rss.parse.mockResolvedValue({
        items: [
          {
            title: 'orphan',
            link: 'https://example.com/orphan',
            'content:encoded': '<p>본문</p>',
          },
        ],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'a2',
          url: 'https://example.com/orphan',
          title: 'orphan-db',
          summaryOneLine: null,
        },
      ]);

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(0);
      expect(prisma.article.create).not.toHaveBeenCalled();
      // DB 행 기준(id/title)으로 잡만 다시 적재
      expect(summarizationQueue.add).toHaveBeenCalledWith(
        'summarize',
        expect.objectContaining({ articleId: 'a2', title: 'orphan-db' }),
        expect.objectContaining({ jobId: 'summarize:a2' }),
      );
      expect(embeddingQueue.add).toHaveBeenCalledWith(
        'embed',
        expect.objectContaining({ articleId: 'a2' }),
        expect.objectContaining({ jobId: 'embed:a2' }),
      );
    });

    it('title 또는 link 없는 item은 skip', async () => {
      rss.parse.mockResolvedValue({
        items: [
          { title: '제목만 있고 링크 없음' },
          { link: 'https://example.com/x' }, // title 없음
        ],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(0);
      expect(prisma.article.create).not.toHaveBeenCalled();
    });

    it('link 없어도 guid 가 http(s) URL 이면 폴백으로 저장', async () => {
      rss.parse.mockResolvedValue({
        items: [{ title: 'guid only', guid: 'https://example.com/from-guid' }],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-g',
        title: 'guid only',
      });
      rss.resolveImageUrl.mockResolvedValue(null);

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(1);
      expect(prisma.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ url: 'https://example.com/from-guid' }),
      });
    });

    it('URL 정규화: 트래킹 파라미터/해시/트레일링 슬래시 제거해 저장, 중복 조회는 원시+정규화 양쪽', async () => {
      const raw = 'https://example.com/post/?utm_source=rss&utm_medium=email#section';
      rss.parse.mockResolvedValue({
        items: [{ title: 'tracked', link: raw }],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-n',
        title: 'tracked',
      });
      rss.resolveImageUrl.mockResolvedValue(null);

      await service.ingestSource('src-1', 'https://feed.com/rss');

      // 기존 행이 원시 url 로 저장돼 있을 수 있어 양쪽을 조회
      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {
          url: {
            in: expect.arrayContaining([raw, 'https://example.com/post']),
          },
        },
        select: { id: true, url: true, title: true, summaryOneLine: true },
      });
      // 저장은 정규화 url 로
      expect(prisma.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ url: 'https://example.com/post' }),
      });
    });

    it('원시(utm 포함) url 로 저장된 기존 행도 중복으로 인식', async () => {
      const raw = 'https://example.com/post?utm_source=rss';
      rss.parse.mockResolvedValue({
        items: [{ title: 'dup', link: raw }],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([
        { id: 'a3', url: raw, title: 'dup', summaryOneLine: '있음' },
      ]);

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(0);
      expect(prisma.article.create).not.toHaveBeenCalled();
    });

    it('unique(url) 경합 P2002 는 정상 스킵하고 다음 아이템 계속', async () => {
      rss.parse.mockResolvedValue({
        items: [
          {
            title: 'race',
            link: 'https://example.com/race',
            isoDate: '2026-05-30T01:00:00Z',
          },
          {
            title: 'ok',
            link: 'https://example.com/ok',
            isoDate: '2026-05-30T00:00:00Z',
          },
        ],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.create as jest.Mock)
        .mockRejectedValueOnce(Object.assign(new Error('unique constraint'), { code: 'P2002' }))
        .mockResolvedValueOnce({ id: 'art-ok', title: 'ok' });
      rss.resolveImageUrl.mockResolvedValue(null);

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      // 경합 글은 스킵, 나머지 아이템은 정상 수집
      expect(count).toBe(1);
      expect(prisma.article.create).toHaveBeenCalledTimes(2);
      expect(summarizationQueue.add).toHaveBeenCalledTimes(1);
      expect(summarizationQueue.add).toHaveBeenCalledWith(
        'summarize',
        expect.objectContaining({ articleId: 'art-ok' }),
        expect.anything(),
      );
    });

    it('create 실패(비 P2002)도 아이템 단위로 격리 — 피드 나머지 수집 계속', async () => {
      rss.parse.mockResolvedValue({
        items: [
          {
            title: 'bad',
            link: 'https://example.com/bad',
            isoDate: '2026-05-30T01:00:00Z',
          },
          {
            title: 'good',
            link: 'https://example.com/good',
            isoDate: '2026-05-30T00:00:00Z',
          },
        ],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.create as jest.Mock)
        .mockRejectedValueOnce(new Error('DB timeout'))
        .mockResolvedValueOnce({ id: 'art-good', title: 'good' });
      rss.resolveImageUrl.mockResolvedValue(null);

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(1);
      expect(prisma.article.create).toHaveBeenCalledTimes(2);
    });

    it('큐 적재 실패는 로그만 남기고 다음 아이템 계속 (글은 이미 저장됨)', async () => {
      rss.parse.mockResolvedValue({
        items: [
          {
            title: 'one',
            link: 'https://example.com/one',
            isoDate: '2026-05-30T01:00:00Z',
          },
          {
            title: 'two',
            link: 'https://example.com/two',
            isoDate: '2026-05-30T00:00:00Z',
          },
        ],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.create as jest.Mock)
        .mockResolvedValueOnce({ id: 'art-1', title: 'one' })
        .mockResolvedValueOnce({ id: 'art-2', title: 'two' });
      rss.resolveImageUrl.mockResolvedValue(null);
      summarizationQueue.add.mockRejectedValueOnce(new Error('redis down'));

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      // 첫 글 큐 적재 실패(reanalyze 백필이 회수)에도 두 글 모두 저장
      expect(count).toBe(2);
      expect(prisma.article.create).toHaveBeenCalledTimes(2);
      expect(summarizationQueue.add).toHaveBeenCalledTimes(2);
    });

    it('이미지 해석 실패는 썸네일 없이 진행 (글 수집 유지)', async () => {
      rss.parse.mockResolvedValue({
        items: [{ title: 'img fail', link: 'https://example.com/img' }],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-i',
        title: 'img fail',
      });
      rss.resolveImageUrl.mockRejectedValue(new Error('og fetch 실패'));

      const count = await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(count).toBe(1);
      expect(prisma.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ imageUrl: null }),
      });
    });

    it('500자 초과 title은 잘라서 저장', async () => {
      const longTitle = 'A'.repeat(800);
      rss.parse.mockResolvedValue({
        items: [{ title: longTitle, link: 'https://example.com/long' }],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-2',
        title: longTitle,
      });
      rss.resolveImageUrl.mockResolvedValue(null);

      await service.ingestSource('src-1', 'https://feed.com/rss');

      const callArg = (prisma.article.create as jest.Mock).mock.calls[0][0];
      expect(callArg.data.title.length).toBeLessThanOrEqual(500);
    });

    it('isoDate 없으면 현재 시각으로 fallback', async () => {
      rss.parse.mockResolvedValue({
        items: [{ title: 'no-date', link: 'https://example.com/nd' }],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-3',
        title: 'no-date',
      });
      rss.resolveImageUrl.mockResolvedValue(null);

      const before = Date.now();
      await service.ingestSource('src-1', 'https://feed.com/rss');
      const after = Date.now();

      const callArg = (prisma.article.create as jest.Mock).mock.calls[0][0];
      const ts = callArg.data.publishedAt.getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('수집 성공 시 Source.lastFetchedAt 갱신 + lastError 리셋', async () => {
      rss.parse.mockResolvedValue({ items: [] } as never);

      await service.ingestSource('src-1', 'https://feed.com/rss');

      expect(prisma.source.update).toHaveBeenCalledWith({
        where: { id: 'src-1' },
        data: expect.objectContaining({
          lastFetchedAt: expect.any(Date),
          lastError: null,
        }),
      });
    });

    it('수집 실패 시 Source.lastError 기록 후 rethrow (lastFetchedAt 은 유지)', async () => {
      rss.parse.mockRejectedValue(new Error('feed 404'));

      await expect(service.ingestSource('src-1', 'https://feed.com/rss')).rejects.toThrow(
        'feed 404',
      );

      expect(prisma.source.update).toHaveBeenCalledWith({
        where: { id: 'src-1' },
        data: { lastError: expect.stringContaining('feed 404') },
      });
      const call = (prisma.source.update as jest.Mock).mock.calls[0][0];
      expect(call.data.lastFetchedAt).toBeUndefined();
    });

    it('소스 상태 기록 실패가 수집 결과를 가리지 않음', async () => {
      rss.parse.mockResolvedValue({
        items: [{ title: 'ok', link: 'https://example.com/ok' }],
      } as never);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-s',
        title: 'ok',
      });
      rss.resolveImageUrl.mockResolvedValue(null);
      (prisma.source.update as jest.Mock).mockRejectedValue(new Error('db down'));

      await expect(service.ingestSource('src-1', 'https://feed.com/rss')).resolves.toBe(1);
    });
  });

  describe('ingestAll', () => {
    it('모든 active source에 대해 ingestSource 호출, 합계 반환', async () => {
      (prisma.source.findMany as jest.Mock).mockResolvedValue([
        { id: 's1', name: 'A', feedUrl: 'https://a' },
        { id: 's2', name: 'B', feedUrl: 'https://b' },
      ]);
      jest.spyOn(service, 'ingestSource').mockResolvedValueOnce(3).mockResolvedValueOnce(5);

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
