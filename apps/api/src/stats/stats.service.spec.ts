import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService, fillRecentDays, startOfDayUtc, toIsoDate } from './stats.service';

describe('stats helpers', () => {
  describe('startOfDayUtc', () => {
    it('UTC 자정으로 내린다 (시/분/초 제거)', () => {
      const d = new Date('2026-06-23T15:42:09.123Z');
      expect(startOfDayUtc(d).toISOString()).toBe('2026-06-23T00:00:00.000Z');
    });
  });

  describe('toIsoDate', () => {
    it('yyyy-mm-dd 로 자른다', () => {
      expect(toIsoDate(new Date('2026-06-23T00:00:00.000Z'))).toBe('2026-06-23');
    });
  });

  describe('fillRecentDays', () => {
    const since = new Date('2026-06-17T00:00:00.000Z'); // 오늘 2026-06-23 기준 7일 윈도우 시작

    it('빠진 날짜를 0 으로 채워 항상 7일을 반환한다', () => {
      const rows = [
        { date: '2026-06-17', count: 3 },
        { date: '2026-06-20', count: 5 },
      ];
      const out = fillRecentDays(rows, since);
      expect(out).toHaveLength(7);
      expect(out[0]).toEqual({ date: '2026-06-17', count: 3 });
      expect(out[1]).toEqual({ date: '2026-06-18', count: 0 });
      expect(out[3]).toEqual({ date: '2026-06-20', count: 5 });
      expect(out.at(-1)?.date).toBe('2026-06-23');
    });

    it('데이터가 없으면 7일 모두 0 이다', () => {
      const out = fillRecentDays([], since);
      expect(out).toHaveLength(7);
      expect(out.every((d) => d.count === 0)).toBe(true);
    });
  });
});

describe('StatsService.collection', () => {
  let service: StatsService;
  let prisma: {
    article: { count: jest.Mock; groupBy: jest.Mock };
    source: { findMany: jest.Mock };
    conference: { count: jest.Mock };
    video: { count: jest.Mock };
    repo: { count: jest.Mock };
    $queryRaw: jest.Mock;
  };

  // 오늘/어제(UTC 자정) — collection 의 윈도우는 실제 now 기준이므로 동적으로 만든다.
  const today = startOfDayUtc(new Date());
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);

  beforeEach(async () => {
    prisma = {
      article: { count: jest.fn(), groupBy: jest.fn() },
      source: { findMany: jest.fn() },
      conference: { count: jest.fn() },
      video: { count: jest.fn() },
      repo: { count: jest.fn() },
      $queryRaw: jest.fn(),
    };

    // article.count 는 total, summarized 순으로 호출된다.
    prisma.article.count
      .mockResolvedValueOnce(200) // total
      .mockResolvedValueOnce(150); // summarized
    // embeddedCount → date 집계 순으로 $queryRaw 가 호출된다.
    prisma.$queryRaw
      .mockResolvedValueOnce([{ count: 120n }]) // embedded
      .mockResolvedValueOnce([
        { day: yesterday, count: 12n },
        { day: today, count: 8n },
      ]);
    prisma.article.groupBy.mockResolvedValue([
      { sourceId: 's1', _count: { _all: 80 } },
      { sourceId: 's2', _count: { _all: 40 } },
    ]);
    prisma.source.findMany.mockResolvedValue([
      { id: 's1', name: 'Hacker News' },
      { id: 's2', name: 'Lobsters' },
    ]);
    prisma.conference.count.mockResolvedValue(7);
    prisma.video.count.mockResolvedValue(33);
    prisma.repo.count.mockResolvedValue(50);

    const module: TestingModule = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StatsService);
  });

  it('글 집계(총/요약/미요약/임베딩)를 계산한다', async () => {
    const res = await service.collection();
    expect(res.articles).toEqual({
      total: 200,
      summarized: 150,
      unsummarized: 50,
      embedded: 120,
    });
  });

  it('요약 완료 카운트는 summaryOneLine not null 조건으로 조회한다', async () => {
    await service.collection();
    expect(prisma.article.count).toHaveBeenNthCalledWith(2, {
      where: { summaryOneLine: { not: null } },
    });
  });

  it('소스별 상위 N 을 desc 정렬 + take 로 조회하고 이름을 붙인다', async () => {
    const res = await service.collection();
    const args = prisma.article.groupBy.mock.calls[0][0];
    expect(args.by).toEqual(['sourceId']);
    expect(args.take).toBe(8);
    expect(args.orderBy).toEqual({ _count: { sourceId: 'desc' } });
    expect(res.topSources).toEqual([
      { sourceId: 's1', name: 'Hacker News', count: 80 },
      { sourceId: 's2', name: 'Lobsters', count: 40 },
    ]);
  });

  it('최근 7일을 채워 반환하고 빠진 날은 0 이다', async () => {
    const res = await service.collection();
    expect(res.recentDaily).toHaveLength(7);
    const last = res.recentDaily.at(-1);
    const prev = res.recentDaily.at(-2);
    expect(last).toEqual({ date: toIsoDate(today), count: 8 });
    expect(prev).toEqual({ date: toIsoDate(yesterday), count: 12 });
    // 윈도우 앞쪽 빈 날은 0
    expect(res.recentDaily[0].count).toBe(0);
  });

  it('컨퍼런스/영상/레포 카운트를 포함한다', async () => {
    const res = await service.collection();
    expect(res.conferences).toBe(7);
    expect(res.videos).toBe(33);
    expect(res.repos).toBe(50);
  });

  it('소스가 없으면 topSources 는 빈 배열이고 source 조회를 건너뛴다', async () => {
    prisma.article.groupBy.mockResolvedValue([]);
    const res = await service.collection();
    expect(res.topSources).toEqual([]);
    expect(prisma.source.findMany).not.toHaveBeenCalled();
  });
});
