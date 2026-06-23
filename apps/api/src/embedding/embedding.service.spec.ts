import { Test } from '@nestjs/testing';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let prisma: { $executeRawUnsafe: jest.Mock };
  let gemini: { isAvailable: jest.Mock; embed: jest.Mock };

  async function build(available: boolean) {
    prisma = { $executeRawUnsafe: jest.fn() };
    gemini = {
      isAvailable: jest.fn().mockReturnValue(available),
      embed: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: GeminiService, useValue: gemini },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(EmbeddingService);
  }

  describe('Gemini 미설정', () => {
    beforeEach(async () => {
      await build(false);
    });

    it('storeArticleEmbedding 호출해도 silent skip (throw X)', async () => {
      await service.storeArticleEmbedding('a1', 't', 's');
      expect(gemini.embed).not.toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe('Gemini 가능', () => {
    beforeEach(async () => {
      await build(true);
    });

    it('embedDocument 는 RETRIEVAL_DOCUMENT 로 호출', async () => {
      gemini.embed.mockResolvedValue([0.1, 0.2, 0.3]);
      const result = await service.embedDocument('text');
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(gemini.embed).toHaveBeenCalledWith('text', 'RETRIEVAL_DOCUMENT');
    });

    it('embedQuery 는 RETRIEVAL_QUERY 로 호출', async () => {
      gemini.embed.mockResolvedValue([1]);
      await service.embedQuery('q');
      expect(gemini.embed).toHaveBeenCalledWith('q', 'RETRIEVAL_QUERY');
    });

    it('storeArticleEmbedding 은 vector literal 로 UPDATE 호출', async () => {
      gemini.embed.mockResolvedValue([0.5, 0.6, 0.7]);
      await service.storeArticleEmbedding('art-1', 'title', 'snippet');

      const sql = prisma.$executeRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toMatch(/UPDATE "Article"/);
      expect(sql).toMatch(/embedding = \$1::vector/);
      expect(prisma.$executeRawUnsafe.mock.calls[0][1]).toBe('[0.5,0.6,0.7]');
      expect(prisma.$executeRawUnsafe.mock.calls[0][2]).toBe('art-1');
    });

    it('storeArticleEmbedding 은 8000자로 truncate', async () => {
      gemini.embed.mockResolvedValue([0]);
      const huge = 'x'.repeat(20_000);
      await service.storeArticleEmbedding('a', 'T', huge);
      const input = gemini.embed.mock.calls[0][0] as string;
      expect(input.length).toBeLessThanOrEqual(8000);
    });
  });
});
