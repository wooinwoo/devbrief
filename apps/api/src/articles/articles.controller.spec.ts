import { BATCH_MAX_IDS, TOTAL_COUNT_HEADER } from '@devbrief/shared';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

type FindManyArgs = {
  where?: { id?: { in?: string[] }; source?: { provider?: string } };
  select?: Record<string, unknown>;
  include?: unknown;
  omit?: unknown;
  skip?: number;
  take?: number;
};

/** @Res passthrough 스텁 — 헤더 기록만 검증한다 */
function resStub() {
  return { setHeader: jest.fn() } as unknown as Response & {
    setHeader: jest.Mock;
  };
}

describe('ArticlesController', () => {
  let controller: ArticlesController;
  let findMany: jest.Mock;
  let count: jest.Mock;
  let findRelated: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([]);
    count = jest.fn().mockResolvedValue(0);
    findRelated = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        {
          provide: PrismaService,
          useValue: { article: { findMany, count, findUnique: jest.fn() } },
        },
        { provide: ArticlesService, useValue: { findRelated } },
      ],
    }).compile();

    controller = module.get(ArticlesController);
  });

  describe('query boundaries', () => {
    it.each(['-1', '1.5', 'Infinity', 'NaN'])(
      'normalizes invalid limit %s before Prisma',
      async (limit) => {
        await controller.list(resStub(), undefined, limit);
        expect(findMany.mock.calls[0][0].take).toBe(30);
      },
    );
    it('does not pass out-of-range skip to Prisma', async () => {
      await controller.list(resStub(), undefined, undefined, '99999999999999999999999');
      expect(findMany.mock.calls[0][0].skip).toBe(0);
    });
    it('rejects repeated search parameters before querying', async () => {
      await expect(
        controller.list(resStub(), undefined, undefined, undefined, ['one', 'two'] as never),
      ).rejects.toMatchObject({ status: 400 });
      expect(findMany).not.toHaveBeenCalled();
    });
    it('rejects repeated batch IDs instead of throwing a server error', async () => {
      await expect(controller.batch(['a', 'b'] as never)).rejects.toMatchObject({ status: 400 });
      expect(findMany).not.toHaveBeenCalled();
    });
  });
  describe('list', () => {
    it('searches every article with the same query for rows and total count', async () => {
      const res = resStub();
      count.mockResolvedValue(12);
      await controller.list(res, undefined, '8', '0', '  React  ');
      const where = findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { title: { contains: 'React', mode: 'insensitive' } },
        { titleKo: { contains: 'React', mode: 'insensitive' } },
        { summaryOneLine: { contains: 'React', mode: 'insensitive' } },
      ]);
      expect(count).toHaveBeenCalledWith({ where });
      expect(res.setHeader).toHaveBeenCalledWith(TOTAL_COUNT_HEADER, '12');
    });

    it('목록 응답도 동일한 화이트리스트만 select 한다 (본문 필드 누수 방지)', async () => {
      await controller.list(resStub(), undefined, '30');
      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.select).toBeDefined();
      expect(args.select).not.toHaveProperty('contentSnippet');
      expect(args.select).not.toHaveProperty('contentHtml');
      expect(args.select).not.toHaveProperty('author');
      expect(args.select).not.toHaveProperty('fetchedAt');
      expect(args.select?.source).toEqual({
        select: { name: true, provider: true },
      });
      expect(args.include).toBeUndefined();
      expect(args.omit).toBeUndefined();
    });

    it('offset 미지정이면 skip 0 으로 조회한다 (기존 호출 하위호환)', async () => {
      await controller.list(resStub());
      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.skip).toBe(0);
      expect(args.take).toBe(30);
    });

    it('offset 을 skip 으로 넘긴다 (소수는 내림)', async () => {
      await controller.list(resStub(), undefined, '10', '20');
      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);

      await controller.list(resStub(), undefined, undefined, '3.9');
      expect((findMany.mock.calls[1][0] as FindManyArgs).skip).toBe(3);
    });

    it('음수/NaN/Infinity offset 은 0 으로 방어한다', async () => {
      for (const bad of ['-5', 'abc', 'Infinity', '']) {
        await controller.list(resStub(), undefined, undefined, bad);
      }
      for (const call of findMany.mock.calls) {
        expect((call[0] as FindManyArgs).skip).toBe(0);
      }
    });

    it('X-Total-Count 헤더에 동일 where 의 count 를 담는다 (감사 c62)', async () => {
      count.mockResolvedValue(123);
      const res = resStub();

      const rows = [{ id: 'a' }];
      findMany.mockResolvedValue(rows);
      const result = await controller.list(res, 'geeknews', '10', '20');

      // 본문은 기존 배열 그대로 (하위호환)
      expect(result).toBe(rows);
      expect(res.setHeader).toHaveBeenCalledWith(TOTAL_COUNT_HEADER, '123');

      // count 는 findMany 와 같은 where (offset/limit 무관 전체 건수)
      const listWhere = (findMany.mock.calls[0][0] as FindManyArgs).where;
      expect(count).toHaveBeenCalledWith({ where: listWhere });
      expect(listWhere).toEqual({ source: { provider: 'geeknews' } });
    });

    it('source 필터가 없으면 count 도 where 없이 전체를 센다', async () => {
      count.mockResolvedValue(7);
      const res = resStub();
      await controller.list(res);
      expect(count).toHaveBeenCalledWith({ where: undefined });
      expect(res.setHeader).toHaveBeenCalledWith(TOTAL_COUNT_HEADER, '7');
    });
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

    it('정상 ids 는 trim 후 in 절로 조회하고 source 는 name/provider 만 select 한다', async () => {
      const rows = [
        { id: 'a', title: 'A', source: { name: 'S', provider: 'p' } },
        { id: 'b', title: 'B', source: null },
      ];
      findMany.mockResolvedValue(rows);

      const result = await controller.batch(' a , b ');

      expect(result).toBe(rows);
      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.where?.id?.in).toEqual(['a', 'b']);
      expect(args.select?.source).toEqual({
        select: { name: true, provider: true },
      });
      expect(args.include).toBeUndefined();
    });

    it('배치 응답은 웹 DTO 화이트리스트만 select 한다 (contentSnippet/contentHtml 제외)', async () => {
      await controller.batch('a');
      const args = findMany.mock.calls[0][0] as FindManyArgs;
      const select = args.select ?? {};
      expect(Object.keys(select).sort()).toEqual(
        [
          'id',
          'title',
          'titleKo',
          'url',
          'summaryOneLine',
          'summaryThreeLine',
          'publishedAt',
          'tags',
          'imageUrl',
          'language',
          'source',
        ].sort(),
      );
      expect(select).not.toHaveProperty('contentSnippet');
      expect(select).not.toHaveProperty('contentHtml');
      expect(args.omit).toBeUndefined();
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

    it('상한은 중복 제거 후 고유 id 기준으로 적용된다 (shared BATCH_MAX_IDS 단일 소스)', async () => {
      // 상한+20개 고유 id 를 각각 2번씩 → 중복 제거 후에도 상한 초과분만 잘린다.
      const unique = Array.from({ length: BATCH_MAX_IDS + 20 }, (_, i) => `u${i}`);
      const dup = unique.flatMap((id) => [id, id]);
      await controller.batch(dup.join(','));

      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.where?.id?.in).toHaveLength(BATCH_MAX_IDS);
      expect(args.where?.id?.in?.[0]).toBe('u0');
      expect(args.where?.id?.in?.[BATCH_MAX_IDS - 1]).toBe(`u${BATCH_MAX_IDS - 1}`);
    });

    it('상한을 초과하면 앞에서부터 BATCH_MAX_IDS 개만 조회한다', async () => {
      const ids = Array.from({ length: BATCH_MAX_IDS + 50 }, (_, i) => `id${i}`);
      await controller.batch(ids.join(','));

      const args = findMany.mock.calls[0][0] as FindManyArgs;
      expect(args.where?.id?.in).toHaveLength(BATCH_MAX_IDS);
      expect(args.where?.id?.in?.[0]).toBe('id0');
      expect(args.where?.id?.in?.[BATCH_MAX_IDS - 1]).toBe(`id${BATCH_MAX_IDS - 1}`);
    });
  });

  describe('related', () => {
    it('limit 없이 호출하면 서비스 기본값(undefined)을 위임한다', async () => {
      const rows = [{ id: 'b' }];
      findRelated.mockResolvedValue(rows);

      const result = await controller.related('a', undefined);

      expect(result).toBe(rows);
      expect(findRelated).toHaveBeenCalledWith('a', undefined);
    });

    it('정수 limit 은 숫자로 변환해 위임한다', async () => {
      await controller.related('a', '8');
      expect(findRelated).toHaveBeenCalledWith('a', 8);
    });

    it('숫자가 아닌 limit 은 undefined 로 위임한다 (서비스가 기본값 적용)', async () => {
      await controller.related('a', 'abc');
      expect(findRelated).toHaveBeenCalledWith('a', undefined);
    });
  });
});
