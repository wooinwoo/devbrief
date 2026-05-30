import { Test } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { AnthropicService } from '../ai/anthropic.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embedding/embedding.service';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: jest.Mocked<PrismaService>;
  let embedding: jest.Mocked<EmbeddingService>;
  let anthropic: { client: { messages: { stream: jest.Mock } } };

  beforeEach(async () => {
    anthropic = {
      client: {
        messages: {
          stream: jest.fn(),
        },
      },
    };

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
        { provide: AnthropicService, useValue: anthropic },
      ],
    }).compile();

    service = moduleRef.get(ChatService);
    prisma = moduleRef.get(PrismaService);
    embedding = moduleRef.get(EmbeddingService);
  });

  describe('retrieve', () => {
    it('쿼리 임베딩 → pgvector 코사인 검색 호출', async () => {
      const fakeVector = new Array(1024).fill(0).map((_, i) => i / 1024);
      embedding.embedQuery.mockResolvedValue(fakeVector);
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          id: 'a1',
          title: 'Article',
          url: 'https://x',
          summaryOneLine: 'one',
          publishedAt: new Date(),
          sourceName: 'GeekNews',
        },
      ]);

      const result = await service.retrieve('Claude Opus 4.8');

      expect(embedding.embedQuery).toHaveBeenCalledWith('Claude Opus 4.8');
      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      const callArgs = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      const sql = callArgs[0] as string;
      expect(sql).toMatch(/Article/);
      expect(sql).toMatch(/embedding <=>/);
      // vector literal 형식
      expect(callArgs[1]).toMatch(/^\[.*\]$/);
      // topK 기본 8
      expect(callArgs[2]).toBe(8);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Article');
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

      anthropic.client.messages.stream.mockReturnValue(
        (async function* () {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: '답변' },
          };
        })(),
      );

      const chunks: string[] = [];
      for await (const c of service.chatStream('test')) chunks.push(c);

      expect(chunks).toEqual(['답변']);
      const callArg = anthropic.client.messages.stream.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('(관련 글 없음)');
    });

    it('text_delta 외 이벤트는 무시', async () => {
      embedding.embedQuery.mockResolvedValue([0]);
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);

      anthropic.client.messages.stream.mockReturnValue(
        (async function* () {
          yield { type: 'message_start' };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: '안녕' },
          };
          yield { type: 'content_block_delta', delta: { type: 'input_json_delta' } };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: '하세요' },
          };
          yield { type: 'message_stop' };
        })(),
      );

      const chunks: string[] = [];
      for await (const c of service.chatStream('q')) chunks.push(c);

      expect(chunks).toEqual(['안녕', '하세요']);
    });

    it('컨텍스트 글들이 [1] [2] 형식으로 prompt에 포함', async () => {
      embedding.embedQuery.mockResolvedValue([0]);
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          id: 'a1',
          title: 'First',
          url: 'https://1',
          summaryOneLine: '요약1',
          publishedAt: new Date('2026-05-30'),
          sourceName: 'GeekNews',
        },
        {
          id: 'a2',
          title: 'Second',
          url: 'https://2',
          summaryOneLine: '요약2',
          publishedAt: new Date('2026-05-29'),
          sourceName: 'TechCrunch',
        },
      ]);

      anthropic.client.messages.stream.mockReturnValue(
        (async function* () {
          /* empty */
        })(),
      );

      const gen = service.chatStream('q');
      // 실행만 트리거
      for await (const _ of gen) {
        /* drain */
      }

      const prompt = anthropic.client.messages.stream.mock.calls[0][0]
        .messages[0].content as string;

      expect(prompt).toContain('[1] First');
      expect(prompt).toContain('[2] Second');
      expect(prompt).toContain('GeekNews');
      expect(prompt).toContain('요약1');
    });
  });
});
