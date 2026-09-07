import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Gemini 2.5 Flash + text-embedding-004 를 한 곳에서.
 * 모든 AI 호출 (요약 / 번역 / 챗봇 / NER / 영상 분석 / 임베딩) 통일.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private client?: GoogleGenAI;

  static readonly EMBED_DIM = 768; // text-embedding-004 기본 차원

  // 소켓이 행 걸리면 워커 슬롯/크론이 무한 점유되므로 호출 단위 타임아웃 강제.
  // (streamText 는 SSE 챗 등 정상적으로 길어질 수 있어 여기서 묶지 않는다)
  static readonly GENERATE_TIMEOUT_MS = 60_000;
  static readonly EMBED_TIMEOUT_MS = 30_000;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('GEMINI_API_KEY') ?? '';
    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      this.logger.warn('GEMINI_API_KEY 미설정 — 모든 AI 호출 skip');
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  private ensure(): GoogleGenAI {
    if (!this.client) throw new Error('GEMINI_API_KEY not set');
    return this.client;
  }

  /**
   * AbortController 기반 호출 타임아웃. 초과 시 요청을 abort 하고 명확한 에러로 throw
   * — 잡이 실패 처리돼 BullMQ 재시도를 타거나 크론이 다음 주기로 넘어갈 수 있게.
   */
  private async withTimeout<T>(
    label: string,
    ms: number,
    run: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await run(controller.signal);
    } catch (e) {
      if (controller.signal.aborted) {
        throw new Error(`Gemini ${label} 타임아웃 (${ms / 1000}s)`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 텍스트 generation. system 지원 (systemInstruction). */
  async generateText(opts: {
    prompt: string;
    system?: string;
    maxTokens?: number;
    model?: string;
    json?: boolean; // responseMimeType=application/json 강제
  }): Promise<string> {
    const res = await this.withTimeout('generate', GeminiService.GENERATE_TIMEOUT_MS, (signal) =>
      this.ensure().models.generateContent({
        model: opts.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
        config: {
          abortSignal: signal,
          systemInstruction: opts.system,
          maxOutputTokens: opts.maxTokens ?? 800,
          responseMimeType: opts.json ? 'application/json' : undefined,
        },
      }),
    );
    return res.text ?? '';
  }

  /** JSON only. responseMimeType=application/json 강제 + 파싱. */
  async generateJson<T>(opts: {
    prompt: string;
    system?: string;
    maxTokens?: number;
    model?: string;
  }): Promise<T> {
    const text = await this.generateText({ ...opts, json: true });
    // responseMimeType 적용했어도 응답 앞뒤에 공백/줄바꿈 있을 수 있어 안전하게 trim
    const trimmed = text.trim();
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      // 혹시 코드블록(```json ... ```) 으로 감싸져 왔을 때 추출 fallback
      const m = trimmed.match(/\{[\s\S]*\}/);
      if (!m) {
        throw new Error(`Gemini 응답에 JSON 없음: ${trimmed.slice(0, 200)}`);
      }
      return JSON.parse(m[0]) as T;
    }
  }

  /** Streaming text. async generator → chunk yield. */
  async *streamText(opts: {
    prompt: string;
    system?: string;
    maxTokens?: number;
    model?: string;
  }): AsyncGenerator<string> {
    const stream = await this.ensure().models.generateContentStream({
      model: opts.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
      config: {
        systemInstruction: opts.system,
        maxOutputTokens: opts.maxTokens ?? 1200,
      },
    });
    for await (const chunk of stream) {
      const t = chunk.text;
      if (t) yield t;
    }
  }

  /** text-embedding-004 (768 차원). */
  async embed(
    text: string,
    taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  ): Promise<number[]> {
    const res = await this.withTimeout('embed', GeminiService.EMBED_TIMEOUT_MS, (signal) =>
      this.ensure().models.embedContent({
        model: 'text-embedding-004',
        contents: text,
        config: { abortSignal: signal, ...(taskType ? { taskType } : {}) },
      }),
    );
    const vec = res.embeddings?.[0]?.values;
    if (!vec) throw new Error('Gemini embed 응답 비어 있음');
    return vec;
  }
}
