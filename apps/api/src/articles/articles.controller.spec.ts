import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ArticlesController } from './articles.controller';

type FindManyArgs = {
  where?: { id?: { in?: string[] } };
  include?: unknown;
};

describe('ArticlesController', () => {
  let controller: ArticlesController;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        {
          provide: PrismaService,
          useValue: { article: { findMany, findUnique: jest.fn() } },
        },
      ],
    }).compile();

    controller = module.get(ArticlesController);
  });

  describe('batch', () => {
    it('ids 가 없으면 빈 배열을 반환하고 DB 를 조회하지 않는다', async () => {
      const result = await controller.batch(undefined);
      expect(result).toEqual([]);
      expect(findMany).not.toHaveBeenCalled();
    });

    it('빈 문자열/공백만 있으면 빈 배열을 반환한다', async () => {
      expect(await controller.batch('')).toEqual([]);
      expect(await controller.batch('  , , ')).toEqual([]);
      expect(findMany).not.toHaveBeenCalled();
    });

    it('정상 ids 는 trim 후 in 절로 조회하고 source 를 include 한다', async () => {
      const rows = [
        { id: 'a', title: 'A', source: { name: 'S', provider: 'p' } },
        { id: 'b', title: 'B', source: null },
      ];
      findMany.mockResolvedValue(rows);

      const result = await controller.batch(' a , b ');

      expect(result).toBe(rows);
      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.where?.id?.in).toEqual(['a', 'b']);
      expect(args.include).toEqual({ source: true });
    });

    it('찾은 글만 반환한다 (없는 id 혼합 시 DB 결과 그대로)', async () => {
      const rows = [{ id: 'exists', title: 'X', source: null }];
      findMany.mockResolvedValue(rows);

      const result = await controller.batch('exists,ghost');

      expect(result).toEqual(rows);
      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.where?.id?.in).toEqual(['exists', 'ghost']);
    });

    it('중복 id 는 제거하고 조회한다', async () => {
      await controller.batch('a,a,b,b,b,c');

      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.where?.id?.in).toEqual(['a', 'b', 'c']);
    });

    it('상한은 중복 제거 후 고유 id 기준으로 적용된다', async () => {
      // 120개 고유 id 를 각각 2번씩 → 240개 토큰. 중복 제거 후 120개 중 100개만.
      const unique = Array.from({ length: 120 }, (_, i) => `u${i}`);
      const dup = unique.flatMap((id) => [id, id]);
      await controller.batch(dup.join(','));

      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.where?.id?.in).toHaveLength(100);
      expect(args.where?.id?.in?.[0]).toBe('u0');
      expect(args.where?.id?.in?.[99]).toBe('u99');
    });

    it('100개 상한을 초과하면 앞 100개만 조회한다', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => `id${i}`);
      await controller.batch(ids.join(','));

      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.where?.id?.in).toHaveLength(100);
      expect(args.where?.id?.in?.[0]).toBe('id0');
      expect(args.where?.id?.in?.[99]).toBe('id99');
    });
  });
});
