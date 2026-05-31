import { Test } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embedding/embedding.service';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: jest.Mocked<PrismaService>;
  let embedding: jest.Mocked<EmbeddingService>;
  let gemini: {
    streamText: jest.Mock;
  };

  beforeEach(async () => {
    gemini = { streamText: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: { $queryRawUnsafe: jest.fn() },
        },
        {
          provide: EmbeddingService,
          useValue: { embedQuery: jest.fn() },
        },
        { provide: GeminiService, useValue: gemini },
      ],
    }).compile();

    service = moduleRef.get(ChatService);
    prisma = moduleRef.get(PrismaService);
    embedding = moduleRef.get(EmbeddingService);
  });

  describe('retrieve', () => {
    it('쿼리 임베딩 → pgvector 코사인 검색 호출', async () => {
      const fakeVector = new Array(768).fill(0).map((_, i) => i / 768);
      embedding.embedQuery.mockResolvedValue(fakeVector);
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          id: 'a1',
          title: 'Article',
          titleKo: null,
          url: 'https://x',
          summaryOneLine: 'one',
          publishedAt: new Date(),
          sourceName: 'GeekNews',
        },
      ]);

      const result = await service.retrieve('Claude Opus 4.8');

      expect(embedding.embedQuery).toHaveBeenCalledWith('Claude Opus 4.8');
      const callArgs = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      const sql = callArgs[0] as string;
      expect(sql).toMatch(/Article/);
      expect(sql).toMatch(/embedding <=>/);
      expect(callArgs[1]).toMatch(/^\[.*\]$/);
      expect(callArgs[2]).toBe(8);
      expect(result).toHaveLength(1);
    });

    it('topK 인자 전달', async () => {
      embedding.embedQuery.mockResolvedValue([0]);
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);
      await service.retrieve('q', 20);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        20,
      );
    });
  });

  describe('chatStream', () => {
    it('검색 결과 0개여도 stream 호출 (컨텍스트 없음 명시)', async () => {
      embedding.embedQuery.mockResolvedValue([0]);
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);

      gemini.streamText.mockImplementation(async function* () {
        yield '답변';
      });

      const chunks: string[] = [];
      for await (const c of service.chatStream('test')) chunks.push(c);

      expect(chunks).toEqual(['답변']);
      const callArg = gemini.streamText.mock.calls[0][0];
      expect(callArg.prompt).toContain('(관련 글 없음)');
      expect(callArg.system).toMatch(/Pulse/);
    });

    it('컨텍스트 글들이 [1] [2] 형식으로 prompt에 포함 + titleKo 우선', async () => {
      embedding.embedQuery.mockResolvedValue([0]);
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          id: 'a1',
          title: 'First',
          titleKo: '첫 번째 한국어',
          url: 'https://1',
          summaryOneLine: '요약1',
          publishedAt: new Date('2026-05-30'),
          sourceName: 'GeekNews',
        },
        {
          id: 'a2',
          title: 'Second',
          titleKo: null,
          url: 'https://2',
          summaryOneLine: '요약2',
          publishedAt: new Date('2026-05-29'),
          sourceName: 'TechCrunch',
        },
      ]);

      gemini.streamText.mockImplementation(async function* () {
        /* empty */
      });

      for await (const _ of service.chatStream('q')) {
        /* drain */
      }

      const prompt = gemini.streamText.mock.calls[0][0].prompt as string;
      expect(prompt).toContain('[1] 첫 번째 한국어');
      expect(prompt).toContain('[2] Second');
      expect(prompt).toContain('GeekNews');
      expect(prompt).toContain('요약1');
    });
  });
});
