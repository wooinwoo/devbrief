import { PrismaService } from '../prisma/prisma.service';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

describe('IngestionController', () => {
  let controller: IngestionController;
  let ingestion: { ingestAll: jest.Mock };
  let prisma: { article: { findMany: jest.Mock }; $queryRawUnsafe: jest.Mock };
  let queue: { add: jest.Mock };
  let summarizationQueue: { add: jest.Mock };
  let embeddingQueue: { add: jest.Mock };

  beforeEach(() => {
    ingestion = { ingestAll: jest.fn() };
    prisma = {
      article: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    };
    queue = { add: jest.fn() };
    summarizationQueue = { add: jest.fn() };
    embeddingQueue = { add: jest.fn() };
    controller = new IngestionController(
      ingestion as unknown as IngestionService,
      prisma as unknown as PrismaService,
      queue as never,
      summarizationQueue as never,
      embeddingQueue as never,
    );
  });

  it('run 은 ingest-all 잡 적재', async () => {
    await expect(controller.runAsync()).resolves.toEqual({ status: 'queued' });
    expect(queue.add).toHaveBeenCalledWith('ingest-all', {});
  });

  describe('reanalyze (onlyMissing 기본)', () => {
    it('raw 쿼리로 embedding IS NULL / summarySource=free 결손까지 포함해 조회', async () => {
      await controller.reanalyze();

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      const sql = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      // 임베딩만 빠진 글(pgvector 는 Prisma where 불가)과 무료 추출요약 백필 글이 대상에 포함
      expect(sql).toContain('embedding IS NULL');
      expect(sql).toContain(`"summarySource" = 'free'`);
      expect(sql).toContain('"summaryThreeLine" IS NULL');
      expect(prisma.article.findMany).not.toHaveBeenCalled();
    });

    it('결손 종류별로 필요한 큐에만 선별 적재 (멀쩡한 요약을 덮지 않음)', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'a',
          title: 'ta',
          contentSnippet: 'sa',
          needSummary: true,
          needEmbedding: false,
        },
        {
          id: 'b',
          title: 'tb',
          contentSnippet: null,
          needSummary: false,
          needEmbedding: true,
        },
        {
          id: 'c',
          title: 'tc',
          contentSnippet: 'sc',
          needSummary: true,
          needEmbedding: true,
        },
      ]);

      const result = await controller.reanalyze();

      expect(summarizationQueue.add).toHaveBeenCalledTimes(2);
      expect(summarizationQueue.add).toHaveBeenCalledWith(
        'summarize',
        { articleId: 'a', title: 'ta', snippet: 'sa' },
        expect.objectContaining({ attempts: 6 }),
      );
      expect(embeddingQueue.add).toHaveBeenCalledTimes(2);
      expect(embeddingQueue.add).toHaveBeenCalledWith(
        'embed',
        { articleId: 'b', title: 'tb', snippet: '' },
        expect.objectContaining({ attempts: 6 }),
      );
      expect(result).toEqual({ queued: 3, needSummary: 2, needEmbedding: 2 });
    });

    it('limit 은 기본 500, 최대 2000 으로 clamp', async () => {
      await controller.reanalyze(undefined, undefined);
      expect(prisma.$queryRawUnsafe.mock.calls[0][1]).toBe(500);

      await controller.reanalyze(undefined, '99999');
      expect(prisma.$queryRawUnsafe.mock.calls[1][1]).toBe(2000);
    });
  });

  describe('reanalyze (onlyMissing=0 전체)', () => {
    it('findMany 로 전체 조회 후 양쪽 큐에 적재', async () => {
      prisma.article.findMany.mockResolvedValue([{ id: 'a', title: 'ta', contentSnippet: 'sa' }]);

      const result = await controller.reanalyze('0', '10');

      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
      expect(prisma.article.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
      expect(summarizationQueue.add).toHaveBeenCalledTimes(1);
      expect(embeddingQueue.add).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ queued: 1 });
    });
  });
});
