import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

function mockRes() {
  return {
    setHeader: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    writableEnded: false,
  } as unknown as Response & { write: jest.Mock; end: jest.Mock };
}

describe('ChatController.stream', () => {
  let controller: ChatController;
  let chatStream: jest.Mock;

  beforeEach(async () => {
    chatStream = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: { chatStream } }],
    }).compile();
    controller = module.get(ChatController);
  });

  it('정상 스트림은 delta 청크 후 [DONE] 을 보낸다', async () => {
    chatStream.mockImplementation(async function* () {
      yield { citations: [{ index: 1, title: '글', url: 'https://example.com' }] };
      yield { delta: '안녕' };
      yield { delta: '하세요' };
    });
    const res = mockRes();

    await controller.stream({ query: 'q' }, res);

    const writes = res.write.mock.calls.map((c) => c[0] as string);
    expect(writes[0]).toBe(
      `data: ${JSON.stringify({ citations: [{ index: 1, title: '글', url: 'https://example.com' }] })}\n\n`,
    );
    expect(writes[1]).toBe(`data: ${JSON.stringify({ delta: '안녕' })}\n\n`);
    expect(writes).toContain('data: [DONE]\n\n');
    expect(res.end).toHaveBeenCalled();
  });

  it('내부 예외 메시지를 클라이언트로 노출하지 않고 일반화된 메시지만 보낸다', async () => {
    chatStream.mockImplementation(async function* () {
      yield* []; // generator 형태 유지
      throw new Error('GEMINI_API_KEY not set');
    });
    const res = mockRes();
    const errorSpy = jest.spyOn((controller as any).logger, 'error').mockImplementation(() => {});

    await controller.stream({ query: 'q' }, res);

    const writes = res.write.mock.calls.map((c) => c[0] as string);
    const errorWrite = writes.find((w) => w.includes('error'));
    expect(errorWrite).toBeDefined();
    expect(errorWrite).toContain('일시적 오류가 발생했습니다.');
    // 원문 예외(키/모델 힌트)는 어떤 write 에도 없다
    expect(writes.join('')).not.toContain('GEMINI_API_KEY');
    // 상세는 서버 로그로 남는다
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('GEMINI_API_KEY not set'));
    expect(res.end).toHaveBeenCalled();
  });

  it('클라이언트가 먼저 끊겼으면(writableEnded) 에러 write 를 생략한다', async () => {
    chatStream.mockImplementation(async function* () {
      yield* [];
      throw new Error('boom');
    });
    const res = mockRes();
    (res as unknown as { writableEnded: boolean }).writableEnded = true;
    jest.spyOn((controller as any).logger, 'error').mockImplementation(() => {});

    await controller.stream({ query: 'q' }, res);

    const writes = res.write.mock.calls.map((c) => c[0] as string);
    expect(writes.find((w) => w.includes('error'))).toBeUndefined();
  });
});
