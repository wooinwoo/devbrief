import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EmbeddingService } from './embedding.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let prisma: { $executeRawUnsafe: jest.Mock };

  async function build(apiKey: string | undefined) {
    prisma = { $executeRawUnsafe: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(apiKey) },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(EmbeddingService);
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('API 키 없을 때', () => {
    beforeEach(async () => {
      await build(undefined);
    });

    it('embedQuery 호출 시 명시 에러', async () => {
      await expect(service.embedQuery('q')).rejects.toThrow(
        'VOYAGE_API_KEY not set',
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('API 키 있을 때', () => {
    beforeEach(async () => {
      await build('voyage-key');
    });

    it('embedDocument는 input_type=document로 호출', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { data: [{ embedding: [0.1, 0.2] }] },
      });
      const result = await service.embedDocument('text');
      expect(result).toEqual([0.1, 0.2]);
      const body = mockedAxios.post.mock.calls[0][1] as {
        input_type: string;
        model: string;
      };
      expect(body.input_type).toBe('document');
      expect(body.model).toBe('voyage-3');
    });

    it('embedQuery는 input_type=query로 호출', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { data: [{ embedding: [1] }] },
      });
      await service.embedQuery('q');
      const body = mockedAxios.post.mock.calls[0][1] as { input_type: string };
      expect(body.input_type).toBe('query');
    });

    it('Authorization Bearer 헤더 첨부', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { data: [{ embedding: [0] }] },
      });
      await service.embedQuery('q');
      const headers = mockedAxios.post.mock.calls[0][2]?.headers as Record<
        string,
        string
      >;
      expect(headers.Authorization).toBe('Bearer voyage-key');
    });

    it('Voyage 응답 비어 있으면 throw', async () => {
      mockedAxios.post.mockResolvedValue({ data: { data: [] } });
      await expect(service.embedQuery('q')).rejects.toThrow(
        'Voyage returned no embedding',
      );
    });

    it('storeArticleEmbedding은 vector literal로 UPDATE 호출', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { data: [{ embedding: [0.5, 0.6, 0.7] }] },
      });

      await service.storeArticleEmbedding('art-1', 'title', 'snippet');

      const sql = prisma.$executeRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toMatch(/UPDATE "Article"/);
      expect(sql).toMatch(/embedding = \$1::vector/);
      expect(prisma.$executeRawUnsafe.mock.calls[0][1]).toBe('[0.5,0.6,0.7]');
      expect(prisma.$executeRawUnsafe.mock.calls[0][2]).toBe('art-1');
    });

    it('storeArticleEmbedding은 8000자로 truncate', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { data: [{ embedding: [0] }] },
      });
      const huge = 'x'.repeat(20_000);
      await service.storeArticleEmbedding('a', 'T', huge);

      const body = mockedAxios.post.mock.calls[0][1] as { input: string[] };
      expect(body.input[0].length).toBeLessThanOrEqual(8000);
    });
  });
});
