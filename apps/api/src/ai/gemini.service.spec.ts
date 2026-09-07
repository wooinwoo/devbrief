jest.mock('@google/genai', () => {
  const generateContent = jest.fn();
  const embedContent = jest.fn();
  return {
    __esModule: true,
    GoogleGenAI: jest.fn(() => ({
      models: { generateContent, embedContent },
    })),
    __mocks: { generateContent, embedContent },
  };
});
import * as genai from '@google/genai';
import { GeminiService } from './gemini.service';

const { generateContent, embedContent } = (
  genai as unknown as {
    __mocks: { generateContent: jest.Mock; embedContent: jest.Mock };
  }
).__mocks;

// abortSignal 을 존중하는 "행 걸린" 호출 흉내 — abort 되면 reject
const hangUntilAbort = ({ config }: { config: { abortSignal: AbortSignal } }) =>
  new Promise((_, reject) => {
    config.abortSignal.addEventListener('abort', () => reject(new Error('request aborted')));
  });

describe('GeminiService 타임아웃', () => {
  let svc: GeminiService;

  beforeEach(() => {
    generateContent.mockReset();
    embedContent.mockReset();
    svc = new GeminiService({ get: () => 'test-key' } as any);
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('generateText 는 60초 초과 시 명확한 타임아웃 에러로 throw', async () => {
    generateContent.mockImplementation(hangUntilAbort);
    const p = svc.generateText({ prompt: 'x' });
    const assertion = expect(p).rejects.toThrow('Gemini generate 타임아웃 (60s)');
    await jest.advanceTimersByTimeAsync(60_000);
    await assertion;
  });

  it('embed 는 30초 초과 시 명확한 타임아웃 에러로 throw', async () => {
    embedContent.mockImplementation(hangUntilAbort);
    const p = svc.embed('text');
    const assertion = expect(p).rejects.toThrow('Gemini embed 타임아웃 (30s)');
    await jest.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it('타임아웃 전에 응답이 오면 정상 반환한다', async () => {
    generateContent.mockResolvedValue({ text: '응답' });
    await expect(svc.generateText({ prompt: 'x' })).resolves.toBe('응답');
  });

  it('타임아웃이 아닌 실패는 원래 에러를 그대로 전파한다', async () => {
    generateContent.mockRejectedValue(new Error('429 quota'));
    await expect(svc.generateText({ prompt: 'x' })).rejects.toThrow('429 quota');
  });

  it('호출에 abortSignal 이 전달된다', async () => {
    generateContent.mockResolvedValue({ text: 'ok' });
    embedContent.mockResolvedValue({ embeddings: [{ values: [1, 2, 3] }] });

    await svc.generateText({ prompt: 'x' });
    expect(generateContent.mock.calls[0][0].config.abortSignal).toBeInstanceOf(AbortSignal);

    await expect(svc.embed('t')).resolves.toEqual([1, 2, 3]);
    expect(embedContent.mock.calls[0][0].config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('embed 응답이 비어 있으면 throw', async () => {
    embedContent.mockResolvedValue({ embeddings: [] });
    await expect(svc.embed('t')).rejects.toThrow('Gemini embed 응답 비어 있음');
  });
});

describe('GeminiService 키 미설정', () => {
  it('isAvailable=false, 호출 시 명확한 에러', async () => {
    const svc = new GeminiService({ get: () => undefined } as any);
    expect(svc.isAvailable()).toBe(false);
    await expect(svc.generateText({ prompt: 'x' })).rejects.toThrow('GEMINI_API_KEY not set');
  });
});
