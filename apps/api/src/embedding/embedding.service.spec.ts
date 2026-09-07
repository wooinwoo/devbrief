import { Test } from '@nestjs/testing';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

const validVector = new Array(768).fill(0.1);

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
      gemini.embed.mockResolvedValue(validVector);
      const result = await service.embedDocument('text');
      expect(result).toEqual(validVector);
      expect(gemini.embed).toHaveBeenCalledWith('text', 'RETRIEVAL_DOCUMENT');
    });

    it('embedQuery 는 RETRIEVAL_QUERY 로 호출', async () => {
      gemini.embed.mockResolvedValue(validVector);
      await service.embedQuery('q');
      expect(gemini.embed).toHaveBeenCalledWith('q', 'RETRIEVAL_QUERY');
    });

    it('storeArticleEmbedding 은 vector literal 로 UPDATE 호출', async () => {
      gemini.embed.mockResolvedValue(validVector);
      await service.storeArticleEmbedding('art-1', 'title', 'snippet');

      const sql = prisma.$executeRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toMatch(/UPDATE "Article"/);
      expect(sql).toMatch(/embedding = \$1::vector/);
      expect(prisma.$executeRawUnsafe.mock.calls[0][1]).toBe(`[${validVector.join(',')}]`);
      expect(prisma.$executeRawUnsafe.mock.calls[0][2]).toBe('art-1');
    });

    it('storeArticleEmbedding 은 8000자로 truncate', async () => {
      gemini.embed.mockResolvedValue(validVector);
      const huge = 'x'.repeat(20_000);
      await service.storeArticleEmbedding('a', 'T', huge);
      const input = gemini.embed.mock.calls[0][0] as string;
      expect(input.length).toBeLessThanOrEqual(8000);
    });

    it('embed 일시 오류(429 등)는 삼키지 않고 throw — BullMQ 재시도에 태운다', async () => {
      gemini.embed.mockRejectedValue(new Error('429 quota exceeded'));
      await expect(service.storeArticleEmbedding('a1', 't', 's')).rejects.toThrow(
        '429 quota exceeded',
      );
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it.each([
      ['빈 배열', []],
      ['잘못된 차원', [0.1]],
      ['0 벡터', new Array(768).fill(0)],
      ['NaN', [...validVector.slice(1), Number.NaN]],
      ['Infinity', [...validVector.slice(1), Number.POSITIVE_INFINITY]],
      ['문자열', [...validVector.slice(1), '0.1']],
      ['응답 없음', undefined],
    ])('%s 벡터는 질의와 저장 경로 모두 거부한다', async (_label, vector) => {
      gemini.embed.mockResolvedValue(vector);
      await expect(service.embedQuery('q')).rejects.toThrow('벡터 형식 오류');
      await expect(service.storeArticleEmbedding('a1', 't', 's')).rejects.toThrow('벡터 형식 오류');
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });
});
