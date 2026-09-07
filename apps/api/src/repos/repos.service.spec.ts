import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { GithubTrendingService, type TrendingRepo } from './github-trending.service';
import { ReposService } from './repos.service';

function repo(over: Partial<TrendingRepo> = {}): TrendingRepo {
  return {
    fullName: 'o/r',
    owner: 'o',
    name: 'r',
    url: 'https://github.com/o/r',
    description: 'desc',
    language: 'TypeScript',
    languageColor: '#000',
    stars: 100,
    forks: 10,
    periodStars: 5,
    rank: 1,
    ...over,
  };
}

describe('ReposService.refresh', () => {
  let service: ReposService;
  let prisma: {
    repo: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      aggregate: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let trending: { fetch: jest.Mock };
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    prisma = {
      repo: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { fetchedAt: null } }),
        findMany: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    trending = { fetch: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReposService,
        { provide: PrismaService, useValue: prisma },
        { provide: GithubTrendingService, useValue: trending },
      ],
    }).compile();

    service = moduleRef.get(ReposService);
    warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
  });

  it('정상 파싱이면 deleteMany→createMany 트랜잭션으로 갈아끼운다', async () => {
    trending.fetch.mockResolvedValue([repo()]);
    const result = await service.refresh('daily');
    expect(result).toEqual({ period: 'daily', synced: 1 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('0건 파싱이면 기존 데이터를 보존하고 error 로그를 남긴다', async () => {
    trending.fetch.mockResolvedValue([]);
    const result = await service.refresh('daily');
    expect(result).toEqual({ period: 'daily', synced: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('0건 파싱'));
  });

  it('전 항목 periodStars=0 이면 파싱 파손으로 보고 갈아끼우지 않는다', async () => {
    trending.fetch.mockResolvedValue([repo({ periodStars: 0 }), repo({ periodStars: 0, rank: 2 })]);
    const result = await service.refresh('daily');
    expect(result).toEqual({ period: 'daily', synced: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('periodStars=0'));
  });

  it('갱신 실패 시 마지막 성공 sync 가 48시간을 넘었으면 stale warn 을 남긴다', async () => {
    trending.fetch.mockResolvedValue([]);
    const fiftyHoursAgo = new Date(Date.now() - 50 * 3.6e6);
    prisma.repo.aggregate.mockResolvedValue({
      _max: { fetchedAt: fiftyHoursAgo },
    });

    await service.refresh('weekly');

    expect(prisma.repo.aggregate).toHaveBeenCalledWith({
      where: { period: 'weekly' },
      _max: { fetchedAt: true },
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('stale'));
  });

  it('갱신 실패라도 48시간 이내면 stale warn 을 남기지 않는다', async () => {
    trending.fetch.mockResolvedValue([]);
    const oneHourAgo = new Date(Date.now() - 3.6e6);
    prisma.repo.aggregate.mockResolvedValue({
      _max: { fetchedAt: oneHourAgo },
    });

    await service.refresh('daily');

    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('stale'));
  });

  it('데이터가 아예 없으면(첫 실행) stale warn 을 남기지 않는다', async () => {
    trending.fetch.mockResolvedValue([]);
    prisma.repo.aggregate.mockResolvedValue({ _max: { fetchedAt: null } });

    await service.refresh('daily');

    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('stale'));
  });

  it('stale 감지 조회가 실패해도 refresh 결과는 유지된다', async () => {
    trending.fetch.mockResolvedValue([]);
    prisma.repo.aggregate.mockRejectedValue(new Error('db down'));

    const result = await service.refresh('daily');

    expect(result).toEqual({ period: 'daily', synced: 0 });
  });
});
