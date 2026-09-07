// video-analyzer.service 가 ESM 모듈(youtubei.js/@google/genai)을 import — ts-jest 파싱 회피용 mock
jest.mock('youtubei.js', () => ({ Innertube: { create: jest.fn() } }));
jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { VIDEO_ANALYZE_JOB_OPTS, VideoAnalyzerService } from './video-analyzer.service';
import { VideosController } from './videos.controller';
import { YouTubeSyncService } from './youtube-sync.service';

describe('VideosController', () => {
  let controller: VideosController;
  let queue: { add: jest.Mock };
  let analyzer: { fetchAndStore: jest.Mock; enqueueUnanalyzed: jest.Mock };
  let youtube: { syncAllConferences: jest.Mock };
  let prisma: { video: { findMany: jest.Mock } };

  beforeEach(async () => {
    queue = { add: jest.fn().mockResolvedValue({}) };
    analyzer = {
      fetchAndStore: jest.fn().mockResolvedValue({ id: 'v1', videoId: 'abcd1234efg' }),
      enqueueUnanalyzed: jest.fn().mockResolvedValue(2),
    };
    youtube = {
      syncAllConferences: jest.fn().mockResolvedValue({ synced: 5 }),
    };
    prisma = { video: { findMany: jest.fn().mockResolvedValue([]) } };

    const moduleRef = await Test.createTestingModule({
      controllers: [VideosController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: YouTubeSyncService, useValue: youtube },
        { provide: VideoAnalyzerService, useValue: analyzer },
        { provide: getQueueToken('video-analyze'), useValue: queue },
      ],
    }).compile();

    controller = moduleRef.get(VideosController);
  });

  // c16: 컨트롤러 sync 도 크론과 동일한 enqueueUnanalyzed 공유 경로를 탄다
  it('POST /videos/sync — sync 후 enqueueUnanalyzed 로 미분석 영상 적재', async () => {
    const res = await controller.sync();
    expect(youtube.syncAllConferences).toHaveBeenCalledTimes(1);
    expect(analyzer.enqueueUnanalyzed).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ synced: 5, queuedForAnalysis: 2 });
  });

  // c17: 일시 오류 재시도를 위해 enqueue 에 attempts/backoff 옵션 필수
  it('POST /videos/add — 재시도 옵션(VIDEO_ANALYZE_JOB_OPTS)과 함께 enqueue', async () => {
    await controller.addByUrl({ url: 'https://youtu.be/abcd1234efg' });
    expect(queue.add).toHaveBeenCalledWith('analyze', { videoDbId: 'v1' }, VIDEO_ANALYZE_JOB_OPTS);
  });

  it('POST /videos/analyze-all — 재시도 옵션과 함께 enqueue', async () => {
    prisma.video.findMany.mockResolvedValue([{ id: 'v1' }]);
    const res = await controller.analyzeAll();
    expect(queue.add).toHaveBeenCalledWith(
      'analyze',
      { videoDbId: 'v1', force: false },
      VIDEO_ANALYZE_JOB_OPTS,
    );
    expect(res).toEqual({ queued: 1 });
  });
});
