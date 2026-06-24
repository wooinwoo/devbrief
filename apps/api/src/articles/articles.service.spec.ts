import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ArticlesService } from './articles.service';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let queryRaw: jest.Mock;
  let queryRawUnsafe: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn();
    queryRawUnsafe = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: PrismaService,
          useValue: { $queryRaw: queryRaw, $queryRawUnsafe: queryRawUnsafe },
        },
      ],
    }).compile();

    service = module.get(ArticlesService);
  });

  describe('findRelated', () => {
    it('embedding 이 있으면 코사인 유사도 쿼리로 Top-K 를 조회한다 (자기 자신 제외)', async () => {
      queryRaw.mockResolvedValue([{ embedding: '[0.1,0.2,0.3]' }]);
      const rows = [{ id: 'b', title: 'B' }];
      queryRawUnsafe.mockResolvedValue(rows);

      const result = await service.findRelated('a', 5);

      expect(result).toBe(rows);
      const [sql, ...params] = queryRawUnsafe.mock.calls[0];
      // pgvector 코사인 거리 연산자 + 자기 자신/NULL 제외
      expect(sql).toContain('embedding <=> $2::vector');
      expect(sql).toContain('a.id <> $1');
      expect(sql).toContain('a.embedding IS NOT NULL');
      // 파라미터 바인딩: id, 벡터 리터럴, limit
      expect(params).toEqual(['a', '[0.1,0.2,0.3]', 5]);
    });

    it('기준 글이 없으면 최신글 폴백 쿼리를 사용한다', async () => {
      queryRaw.mockResolvedValue([]);

      await service.findRelated('missing', 5);

      const [sql, ...params] = queryRawUnsafe.mock.calls[0];
      expect(sql).toContain('ORDER BY a."publishedAt" DESC');
      expect(sql).not.toContain('<=>');
      expect(params).toEqual(['missing', 5]);
    });

    it('기준 글의 embedding 이 NULL 이면 최신글 폴백을 사용한다', async () => {
      queryRaw.mockResolvedValue([{ embedding: null }]);

      await service.findRelated('a', 3);

      const [sql, ...params] = queryRawUnsafe.mock.calls[0];
      expect(sql).toContain('ORDER BY a."publishedAt" DESC');
      expect(params).toEqual(['a', 3]);
    });

    it('embedding 리터럴 형태가 깨졌으면 폴백한다 (주입 방어)', async () => {
      queryRaw.mockResolvedValue([{ embedding: '[0.1]); DROP TABLE' }]);

      await service.findRelated('a', 5);

      const [sql] = queryRawUnsafe.mock.calls[0];
      expect(sql).toContain('ORDER BY a."publishedAt" DESC');
      expect(sql).not.toContain('<=>');
    });

    it('limit 기본값은 5, 상한은 20, 하한은 1 로 클램프한다', async () => {
      queryRaw.mockResolvedValue([{ embedding: '[0.1,0.2]' }]);

      await service.findRelated('a');
      expect(queryRawUnsafe.mock.calls[0][3]).toBe(5);

      await service.findRelated('a', 999);
      expect(queryRawUnsafe.mock.calls[1][3]).toBe(20);

      await service.findRelated('a', 0);
      expect(queryRawUnsafe.mock.calls[2][3]).toBe(5);

      await service.findRelated('a', -3);
      expect(queryRawUnsafe.mock.calls[3][3]).toBe(1);
    });
  });
});
