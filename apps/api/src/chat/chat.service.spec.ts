import { Test } from '@nestjs/testing';
import { GeminiService } from '../ai/gemini.service';
import { kstDateLabel } from '../common/kst';
import { EmbeddingService } from '../embedding/embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import { type ChatEvent, ChatService } from './chat.service';

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
          sourceProvider: 'geeknews',
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
      embedding.embedQuery.mockResolvedValue(new Array(768).fill(0.1));
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
    it('검색 결과가 없으면 생성 API 없이 안내한다', async () => {
      embedding.embedQuery.mockResolvedValue(new Array(768).fill(0.1));
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);

      gemini.streamText.mockImplementation(async function* () {
        yield '답변';
      });

      const chunks: ChatEvent[] = [];
      for await (const c of service.chatStream('test')) chunks.push(c);

      expect(chunks).toEqual([{ delta: expect.stringContaining('참고할 수집 글이 없어요') }]);
      expect(gemini.streamText).not.toHaveBeenCalled();
    });

    it.each(['embedding', 'database'])('%s 실패는 빈 검색으로 위장하지 않는다', async (failure) => {
      embedding.embedQuery.mockResolvedValue(new Array(768).fill(0.1));
      const error = new Error('retrieval unavailable');
      if (failure === 'embedding') embedding.embedQuery.mockRejectedValue(error);
      else (prisma.$queryRawUnsafe as jest.Mock).mockRejectedValue(error);
      await expect(service.chatStream('q').next()).rejects.toThrow(error);
      expect(gemini.streamText).not.toHaveBeenCalled();
    });

    it('검색 글과 동일한 번호의 출처를 답변보다 먼저 전달한다', async () => {
      embedding.embedQuery.mockResolvedValue(new Array(768).fill(0.1));
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          id: 'a1',
          title: 'First',
          titleKo: '첫 번째 한국어',
          url: 'https://1',
          summaryOneLine: '요약1',
          publishedAt: new Date('2026-05-30'),
          sourceName: 'GeekNews',
          sourceProvider: 'geeknews',
        },
        {
          id: 'a2',
          title: 'Second',
          titleKo: null,
          url: 'https://2',
          summaryOneLine: '요약2',
          publishedAt: new Date('2026-05-29'),
          sourceName: 'TechCrunch',
          sourceProvider: 'techcrunch',
        },
      ]);

      gemini.streamText.mockImplementation(async function* () {
        yield '요약 [2]';
      });

      const events: ChatEvent[] = [];
      for await (const event of service.chatStream('q')) events.push(event);
      expect(events).toEqual([
        {
          citations: [
            {
              index: 1,
              title: '첫 번째 한국어',
              url: 'https://1',
              sourceName: 'GeekNews',
              sourceProvider: 'geeknews',
              publishedAt: '2026-05-30T00:00:00.000Z',
              snippet: '요약1',
            },
            {
              index: 2,
              title: 'Second',
              url: 'https://2',
              sourceName: 'TechCrunch',
              sourceProvider: 'techcrunch',
              publishedAt: '2026-05-29T00:00:00.000Z',
              snippet: '요약2',
            },
          ],
        },
        { delta: '요약 [2]' },
      ]);

      const prompt = gemini.streamText.mock.calls[0][0].prompt as string;
      expect(prompt).toContain('[1] 첫 번째 한국어');
      expect(prompt).toContain('[2] Second');
      expect(prompt).toContain('GeekNews');
      expect(prompt).toContain('요약1');
    });

    it('글 날짜 라벨은 KST 기준 — KST 00~09시 발행 글이 전날(UTC)로 어긋나지 않는다', async () => {
      embedding.embedQuery.mockResolvedValue(new Array(768).fill(0.1));
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          id: 'a1',
          title: 'Edge',
          titleKo: null,
          url: 'https://e',
          summaryOneLine: null,
          // KST 2026-05-30 08:00 = UTC 2026-05-29 23:00 — UTC 라벨이면 05-29 로 어긋난다
          publishedAt: new Date('2026-05-29T23:00:00Z'),
          sourceName: 'GeekNews',
          sourceProvider: 'geeknews',
        },
      ]);
      gemini.streamText.mockImplementation(async function* () {
        /* empty */
      });

      for await (const _ of service.chatStream('q')) {
        /* drain */
      }

      const prompt = gemini.streamText.mock.calls[0][0].prompt as string;
      expect(prompt).toContain('2026-05-30');
      expect(prompt).not.toContain('2026-05-29');
    });

    it('프롬프트에 현재 KST 날짜를 명시한다 (오늘/어제 질문의 기준점)', async () => {
      embedding.embedQuery.mockResolvedValue(new Array(768).fill(0.1));
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          id: 'today',
          title: '글',
          titleKo: null,
          url: 'https://example.com',
          sourceName: '출처',
          sourceProvider: 'rss_generic',
          publishedAt: new Date(),
          summaryOneLine: null,
        },
      ]);
      gemini.streamText.mockImplementation(async function* () {
        /* empty */
      });

      for await (const _ of service.chatStream('오늘 나온 글?')) {
        /* drain */
      }

      const prompt = gemini.streamText.mock.calls[0][0].prompt as string;
      expect(prompt).toContain(`오늘 날짜: ${kstDateLabel()} (KST)`);
    });
  });
});
