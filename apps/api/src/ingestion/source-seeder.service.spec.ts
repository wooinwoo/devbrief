import { PrismaService } from '../prisma/prisma.service';
import { SourceSeederService } from './source-seeder.service';

const HN_FEED = 'https://hnrss.org/frontpage';

describe('SourceSeederService', () => {
  let seeder: SourceSeederService;
  let source: {
    findMany: jest.Mock;
    createMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };

  beforeEach(() => {
    source = {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    };
    seeder = new SourceSeederService({ source } as unknown as PrismaService);
  });

  it('DB 가 비어 있으면 시드 전체를 createMany(skipDuplicates) 로 생성', async () => {
    await seeder.onApplicationBootstrap();

    expect(source.createMany).toHaveBeenCalledTimes(1);
    const arg = source.createMany.mock.calls[0][0];
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data.length).toBeGreaterThan(0);
    expect(arg.data.some((s: { feedUrl: string }) => s.feedUrl === HN_FEED)).toBe(true);
    expect(source.update).not.toHaveBeenCalled();
  });

  it('기존 소스는 건드리지 않음 — 어드민이 끈 active 가 재부팅에도 유지', async () => {
    source.findMany.mockResolvedValue([
      { feedUrl: HN_FEED, homepage: 'https://news.ycombinator.com' },
    ]);

    await seeder.onApplicationBootstrap();

    // 기존 행은 create 대상에서 제외
    const created = source.createMany.mock.calls[0][0].data as Array<{
      feedUrl: string;
    }>;
    expect(created.some((s) => s.feedUrl === HN_FEED)).toBe(false);
    // active 를 만지는 update/updateMany 가 전혀 없어야 함 (시드 부활 금지)
    expect(source.update).not.toHaveBeenCalled();
    expect(source.updateMany).not.toHaveBeenCalled();
  });

  it('anthropic 강제 비활성화(updateMany) 는 더 이상 부팅마다 실행되지 않음', async () => {
    await seeder.onApplicationBootstrap();

    expect(source.updateMany).not.toHaveBeenCalled();
  });

  it('기존 행의 비어 있는 homepage 만 시드 값으로 보충 (active 는 건드리지 않음)', async () => {
    source.findMany.mockResolvedValue([{ feedUrl: HN_FEED, homepage: null }]);

    await seeder.onApplicationBootstrap();

    expect(source.update).toHaveBeenCalledTimes(1);
    const arg = source.update.mock.calls[0][0];
    expect(arg.where).toEqual({ feedUrl: HN_FEED });
    expect(arg.data).toEqual({ homepage: 'https://news.ycombinator.com' });
    expect(arg.data).not.toHaveProperty('active');
  });

  it('시딩 중 DB 에러는 부팅을 막지 않음 (warn 후 skip)', async () => {
    source.findMany.mockRejectedValue(new Error('db unreachable'));

    await expect(seeder.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(source.createMany).not.toHaveBeenCalled();
  });
});
