// youtubei.js 는 ESM이라 ts-jest 가 파싱하지 못한다. 테스트에선 ensureInnertube 를
// 직접 스텁하므로 실제 Innertube 는 불필요 — 모듈 자체를 mock 으로 대체.
jest.mock('youtubei.js', () => ({ Innertube: { create: jest.fn() } }));
// @google/genai 도 ESM — 생성자에서 import 되므로 함께 mock.
jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PermanentAnalysisError,
  VIDEO_ANALYZE_JOB_OPTS,
  VideoAnalyzerService,
} from './video-analyzer.service';

describe('VideoAnalyzerService', () => {
  let service: VideoAnalyzerService;
  let prisma: {
    video: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let gemini: { isAvailable: jest.Mock };
  let queue: { add: jest.Mock };

  const makeInnertube = (basicInfo: Record<string, unknown>) => ({
    getInfo: jest.fn().mockResolvedValue({ basic_info: basicInfo }),
  });

  beforeEach(async () => {
    prisma = {
      video: {
        upsert: jest.fn().mockResolvedValue({ id: 'v1', videoId: 'abcd1234efg' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    gemini = { isAvailable: jest.fn().mockReturnValue(false) };
    queue = { add: jest.fn().mockResolvedValue({}) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VideoAnalyzerService,
        { provide: GeminiService, useValue: gemini },
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('video-analyze'), useValue: queue },
      ],
    }).compile();

    service = moduleRef.get(VideoAnalyzerService);
  });

  const stubInnertube = (innertube: unknown) => {
    jest
      .spyOn(service as unknown as { ensureInnertube: () => Promise<unknown> }, 'ensureInnertube')
      .mockResolvedValue(innertube as never);
  };

  const stubBasicInfo = (basicInfo: Record<string, unknown>) =>
    stubInnertube(makeInnertube(basicInfo));

  describe('fetchAndStore', () => {
    it('start_timestamp 가 있으면 실제 발행일을 publishedAt 으로 저장', async () => {
      const ts = new Date('2026-05-01T08:00:00Z');
      stubBasicInfo({
        title: 'T',
        author: 'C',
        duration: 100,
        view_count: 9,
        start_timestamp: ts,
      });

      await service.fetchAndStore('https://youtu.be/abcd1234efg');

      const arg = prisma.video.upsert.mock.calls[0][0];
      expect(arg.create.publishedAt.toISOString()).toBe(ts.toISOString());
    });

    it('start_timestamp 없으면 현재 시각으로 폴백', async () => {
      stubBasicInfo({
        title: 'T',
        author: 'C',
        duration: 100,
        view_count: 9,
        start_timestamp: null,
      });

      const before = Date.now();
      await service.fetchAndStore('https://youtu.be/abcd1234efg');
      const after = Date.now();

      const arg = prisma.video.upsert.mock.calls[0][0];
      const ms = arg.create.publishedAt.getTime();
      expect(ms).toBeGreaterThanOrEqual(before);
      expect(ms).toBeLessThanOrEqual(after);
    });

    it('upsert update 에는 publishedAt 을 포함하지 않아 기존 발행일을 보존', async () => {
      stubBasicInfo({
        title: 'T',
        author: 'C',
        duration: 100,
        view_count: 9,
        start_timestamp: new Date('2026-05-01T08:00:00Z'),
      });

      await service.fetchAndStore('https://youtu.be/abcd1234efg');

      const arg = prisma.video.upsert.mock.calls[0][0];
      expect(arg.update).not.toHaveProperty('publishedAt');
    });

    // c63: 검증 실패는 BadRequestException 으로 — 웹이 j.message 를 그대로 노출하는 계약
    it('유효하지 않은 URL 이면 BadRequestException (500 아님)', async () => {
      await expect(service.fetchAndStore('not-a-youtube-url')).rejects.toThrow(BadRequestException);
      await expect(service.fetchAndStore('not-a-youtube-url')).rejects.toThrow(
        '유효한 YouTube URL 이 아닙니다',
      );
      expect(prisma.video.upsert).not.toHaveBeenCalled();
    });

    it('getInfo 실패(삭제/비공개 영상)는 BadRequestException 으로 매핑', async () => {
      stubInnertube({
        getInfo: jest.fn().mockRejectedValue(new Error('This video is unavailable')),
      });

      await expect(service.fetchAndStore('https://youtu.be/abcd1234efg')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.video.upsert).not.toHaveBeenCalled();
    });

    it('getInfo 타임아웃(TimeoutError)은 ServiceUnavailableException 으로 매핑', async () => {
      const timeoutErr = new Error('The operation was aborted due to timeout');
      timeoutErr.name = 'TimeoutError';
      stubInnertube({ getInfo: jest.fn().mockRejectedValue(timeoutErr) });

      await expect(service.fetchAndStore('https://youtu.be/abcd1234efg')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('analyzeOne', () => {
    const baseVideo = {
      id: 'v1',
      analyzedAt: null,
      chapters: null,
      chapterSource: null,
      summary: null,
    };

    // c48: 챕터 tier 와 무관하게 설명 기반 summary 를 공통 채움
    it('description 챕터가 있어도 설명 기반 summary 를 함께 저장 (tier2)', async () => {
      prisma.video.findUnique.mockResolvedValue({
        ...baseVideo,
        videoId: 'mock-12345', // tier1/3 skip → tier2 만 실행
        description: 'NestJS 큐 재시도 전략을 다루는 발표 영상입니다.\n0:00 인트로\n1:30 본론',
        durationSec: 300,
      });

      const result = await service.analyzeOne('v1');

      expect(result.chapterSource).toBe('description');
      expect(result.chapters.length).toBe(2);
      expect(result.summary).toContain('NestJS 큐 재시도');
      const data = prisma.video.update.mock.calls[0][0].data;
      expect(data.summary).toContain('NestJS 큐 재시도');
      expect(data.analyzedAt).toBeInstanceOf(Date);
    });

    // c17: 영구 빈 케이스는 analyzedAt 을 찍되 chapterSource='none' 마커
    it('챕터·설명 전부 없는 영구 케이스는 chapterSource=none 으로 analyzedAt 기록', async () => {
      prisma.video.findUnique.mockResolvedValue({
        ...baseVideo,
        videoId: 'mock-12345', // tier1/3 skip, description 없음 → 에러 없이 빈 결과
        description: null,
        durationSec: 300,
      });

      const result = await service.analyzeOne('v1');

      expect(result.chapterSource).toBe('none');
      const data = prisma.video.update.mock.calls[0][0].data;
      expect(data.chapterSource).toBe('none');
      expect(data.analyzedAt).toBeInstanceOf(Date);
    });

    // c17: 일시 오류 + 빈 결과면 analyzedAt 미기록 + throw → BullMQ 재시도/다음 크론 재수거
    it('일시 오류로 빈 결과면 analyzedAt 을 찍지 않고 ServiceUnavailableException', async () => {
      prisma.video.findUnique.mockResolvedValue({
        ...baseVideo,
        videoId: 'abcd1234efg', // real id → tier1 시도
        description: null,
        durationSec: 300,
      });
      stubInnertube({
        getInfo: jest.fn().mockRejectedValue(new Error('ECONNRESET')),
      });

      await expect(service.analyzeOne('v1')).rejects.toThrow(ServiceUnavailableException);
      expect(prisma.video.update).not.toHaveBeenCalled();
    });

    it("'자막 없음' 영구 실패는 재시도 대상이 아니라 chapterSource=none 으로 기록", async () => {
      prisma.video.findUnique.mockResolvedValue({
        ...baseVideo,
        videoId: 'abcd1234efg',
        description: null,
        durationSec: 300,
      });
      // tier1: 챕터 없는 정상 응답 (에러 아님)
      stubBasicInfo({ title: 'T' });
      // tier3 진입 조건: rawGemini 존재. '자막 없음' 은 PermanentAnalysisError.
      (service as unknown as { rawGemini: unknown }).rawGemini = {};
      jest
        .spyOn(
          service as unknown as { analyzeWithGemini: () => Promise<unknown> },
          'analyzeWithGemini',
        )
        .mockRejectedValue(new PermanentAnalysisError('자막 없음'));

      const result = await service.analyzeOne('v1');

      expect(result.chapterSource).toBe('none');
      expect(prisma.video.update).toHaveBeenCalledTimes(1);
    });

    it('Gemini 일시 오류(네트워크)로 빈 결과면 analyzedAt 미기록 + throw', async () => {
      prisma.video.findUnique.mockResolvedValue({
        ...baseVideo,
        videoId: 'abcd1234efg',
        description: null,
        durationSec: 300,
      });
      stubBasicInfo({ title: 'T' });
      (service as unknown as { rawGemini: unknown }).rawGemini = {};
      jest
        .spyOn(
          service as unknown as { analyzeWithGemini: () => Promise<unknown> },
          'analyzeWithGemini',
        )
        .mockRejectedValue(new Error('fetch failed'));

      await expect(service.analyzeOne('v1')).rejects.toThrow(ServiceUnavailableException);
      expect(prisma.video.update).not.toHaveBeenCalled();
    });

    it('일시 오류가 있어도 summary 가 채워졌으면 정상 저장 (빈 결과 아님)', async () => {
      prisma.video.findUnique.mockResolvedValue({
        ...baseVideo,
        videoId: 'abcd1234efg',
        description: '타임스탬프 없는 충분히 긴 발표 설명 텍스트입니다.',
        durationSec: 300,
      });
      stubInnertube({
        getInfo: jest.fn().mockRejectedValue(new Error('ECONNRESET')),
      });

      const result = await service.analyzeOne('v1');

      expect(result.summary).toContain('발표 설명');
      expect(result.chapterSource).toBeNull();
      expect(prisma.video.update).toHaveBeenCalledTimes(1);
    });
  });

  // c16: sync 후 미분석 영상 적재 — 컨트롤러/크론 공유 경로
  describe('enqueueUnanalyzed', () => {
    it('analyzedAt:null 영상을 재시도 옵션과 함께 큐에 적재', async () => {
      prisma.video.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

      const queued = await service.enqueueUnanalyzed();

      expect(queued).toBe(2);
      expect(prisma.video.findMany).toHaveBeenCalledWith({
        where: { analyzedAt: null },
        select: { id: true },
        take: 200,
      });
      expect(queue.add).toHaveBeenCalledTimes(2);
      expect(queue.add).toHaveBeenCalledWith('analyze', { videoDbId: 'a' }, VIDEO_ANALYZE_JOB_OPTS);
    });
  });

  // c35: timedtext fetch 에 AbortSignal 타임아웃 — 워커 슬롯 행 점유 방지
  describe('fetchTranscript', () => {
    it('자막 fetch 에 AbortSignal 타임아웃을 건다', async () => {
      stubInnertube({
        getInfo: jest.fn().mockResolvedValue({
          basic_info: {},
          captions: {
            caption_tracks: [{ base_url: 'https://timedtext.example/x', language_code: 'en' }],
          },
        }),
      });
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<text start="0">hello</text>'),
      });
      const original = global.fetch;
      global.fetch = fetchMock as unknown as typeof fetch;
      try {
        const transcript = await (
          service as unknown as {
            fetchTranscript: (id: string) => Promise<string | null>;
          }
        ).fetchTranscript('abcd1234efg');

        expect(transcript).toContain('hello');
        expect(fetchMock).toHaveBeenCalledWith(
          'https://timedtext.example/x',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
      } finally {
        global.fetch = original;
      }
    });
  });
});
