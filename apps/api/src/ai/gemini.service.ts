import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

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

  /** 텍스트 generation. system 지원 (systemInstruction). */
  async generateText(opts: {
    prompt: string;
    system?: string;
    maxTokens?: number;
    model?: string;
  }): Promise<string> {
    const res = await this.ensure().models.generateContent({
      model: opts.model ?? 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
      config: {
        systemInstruction: opts.system,
        maxOutputTokens: opts.maxTokens ?? 800,
      },
    });
    return res.text ?? '';
  }

  /** JSON only. 응답에서 첫 {} 추출 → JSON.parse. */
  async generateJson<T>(opts: {
    prompt: string;
    system?: string;
    maxTokens?: number;
    model?: string;
  }): Promise<T> {
    const text = await this.generateText(opts);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini 응답에 JSON 없음: ' + text.slice(0, 100));
    return JSON.parse(match[0]) as T;
  }

  /** Streaming text. async generator → chunk yield. */
  async *streamText(opts: {
    prompt: string;
    system?: string;
    maxTokens?: number;
    model?: string;
  }): AsyncGenerator<string> {
    const stream = await this.ensure().models.generateContentStream({
      model: opts.model ?? 'gemini-2.5-flash',
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
  async embed(text: string, taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<number[]> {
    const res = await this.ensure().models.embedContent({
      model: 'text-embedding-004',
      contents: text,
      config: taskType ? { taskType } : undefined,
    });
    const vec = res.embeddings?.[0]?.values;
    if (!vec) throw new Error('Gemini embed 응답 비어 있음');
    return vec;
  }
}
