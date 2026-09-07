import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RssDiscoveryService } from './rss-discovery.service';
import { SourcesController } from './sources.controller';

describe('SourcesController', () => {
  let controller: SourcesController;
  let prisma: {
    source: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    article: { count: jest.Mock; deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let discovery: { discover: jest.Mock; discoverAndRegister: jest.Mock };

  beforeEach(async () => {
    prisma = {
      source: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      article: { count: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    discovery = { discover: jest.fn(), discoverAndRegister: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SourcesController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RssDiscoveryService, useValue: discovery },
      ],
    }).compile();

    controller = module.get(SourcesController);
  });

  describe('list (GET /sources)', () => {
    it('공개 목록은 lastError 를 제외한 화이트리스트만 select 한다 (shared SourcePublic 과 키 대조)', async () => {
      prisma.source.findMany.mockResolvedValue([]);

      await controller.list();

      const args = prisma.source.findMany.mock.calls[0][0] as {
        select: Record<string, unknown>;
        orderBy: unknown;
      };
      // SourcePublic(와이어 계약) 필드와 1:1 — 키가 어긋나면 계약 브리지(컴파일)와 함께 여기서도 잡힌다.
      expect(Object.keys(args.select).sort()).toEqual(
        [
          'id',
          'provider',
          'name',
          'feedUrl',
          'homepage',
          'language',
          'active',
          'createdAt',
          'lastFetchedAt',
        ].sort(),
      );
      expect(args.select).not.toHaveProperty('lastError');
      expect(args.orderBy).toEqual({ createdAt: 'asc' });
    });
  });

  describe('remove (DELETE /sources/:id)', () => {
    it('존재하지 않는 소스는 404', async () => {
      prisma.source.findUnique.mockResolvedValue(null);
      await expect(controller.remove('ghost')).rejects.toThrow(NotFoundException);
      expect(prisma.source.delete).not.toHaveBeenCalled();
    });

    it('글이 있는 소스는 force 없이 409 + 안내 메시지 (FK RESTRICT 500 회귀 방지)', async () => {
      prisma.source.findUnique.mockResolvedValue({ id: 's1' });
      prisma.article.count.mockResolvedValue(42);

      await expect(controller.remove('s1')).rejects.toThrow(ConflictException);
      await expect(controller.remove('s1')).rejects.toThrow(/42건.*force=1|force=1.*42건/s);
      expect(prisma.source.delete).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('force=1 이면 트랜잭션으로 Article → Source 순서로 삭제', async () => {
      prisma.source.findUnique.mockResolvedValue({ id: 's1' });
      prisma.article.count.mockResolvedValue(3);

      const result = await controller.remove('s1', '1');

      expect(result).toEqual({ ok: true, deletedArticles: 3 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.article.deleteMany).toHaveBeenCalledWith({
        where: { sourceId: 's1' },
      });
      expect(prisma.source.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
    });

    it('글이 없는 소스는 바로 삭제된다', async () => {
      prisma.source.findUnique.mockResolvedValue({ id: 's2' });
      prisma.article.count.mockResolvedValue(0);

      const result = await controller.remove('s2');

      expect(result).toEqual({ ok: true, deletedArticles: 0 });
      expect(prisma.source.delete).toHaveBeenCalledWith({
        where: { id: 's2' },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('discover', () => {
    it('url 누락 시 400', async () => {
      await expect(controller.discover({})).rejects.toThrow(BadRequestException);
    });

    it('discovery 서비스에 위임한다', async () => {
      discovery.discover.mockResolvedValue([]);
      const result = await controller.discover({
        url: 'https://blog.example.com',
      });
      expect(result).toEqual({ feeds: [] });
      expect(discovery.discover).toHaveBeenCalledWith('https://blog.example.com');
    });
  });
});
