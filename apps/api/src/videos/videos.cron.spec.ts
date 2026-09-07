// video-analyzer.service 가 ESM 모듈(youtubei.js/@google/genai)을 import — ts-jest 파싱 회피용 mock
jest.mock('youtubei.js', () => ({ Innertube: { create: jest.fn() } }));
jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

import { Test } from '@nestjs/testing';
import { VideoAnalyzerService } from './video-analyzer.service';
import { VideosCron } from './videos.cron';
import { YouTubeSyncService } from './youtube-sync.service';

describe('VideosCron', () => {
  let cron: VideosCron;
  let youtube: { syncAllConferences: jest.Mock };
  let analyzer: { enqueueUnanalyzed: jest.Mock };

  beforeEach(async () => {
    youtube = { syncAllConferences: jest.fn() };
    analyzer = { enqueueUnanalyzed: jest.fn().mockResolvedValue(0) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        VideosCron,
        { provide: YouTubeSyncService, useValue: youtube },
        { provide: VideoAnalyzerService, useValue: analyzer },
      ],
    }).compile();
    cron = moduleRef.get(VideosCron);
  });

  it('weekly() 호출 시 YouTubeSyncService.syncAllConferences 호출', async () => {
    youtube.syncAllConferences.mockResolvedValue({ synced: 30 });
    await cron.weekly();
    expect(youtube.syncAllConferences).toHaveBeenCalledTimes(1);
  });

  // c16: sync 만 하고 끝나면 새 영상의 chapters/summary 가 영구 NULL
  it('sync 완료 후 미분석 영상을 분석 큐에 적재 (enqueueUnanalyzed)', async () => {
    youtube.syncAllConferences.mockResolvedValue({ synced: 3 });
    analyzer.enqueueUnanalyzed.mockResolvedValue(3);
    await cron.weekly();
    expect(analyzer.enqueueUnanalyzed).toHaveBeenCalledTimes(1);
  });

  it('YouTubeSyncService 실패해도 throw 안 함 (cron이 죽지 않게)', async () => {
    youtube.syncAllConferences.mockRejectedValue(new Error('API quota'));
    await expect(cron.weekly()).resolves.not.toThrow();
  });

  it('enqueueUnanalyzed 실패해도 throw 안 함 (cron이 죽지 않게)', async () => {
    youtube.syncAllConferences.mockResolvedValue({ synced: 1 });
    analyzer.enqueueUnanalyzed.mockRejectedValue(new Error('queue down'));
    await expect(cron.weekly()).resolves.not.toThrow();
  });
});
