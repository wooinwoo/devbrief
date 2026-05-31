import { Test } from '@nestjs/testing';
import { VideosCron } from './videos.cron';
import { YouTubeSyncService } from './youtube-sync.service';

describe('VideosCron', () => {
  let cron: VideosCron;
  let youtube: { syncAllConferences: jest.Mock };

  beforeEach(async () => {
    youtube = { syncAllConferences: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        VideosCron,
        { provide: YouTubeSyncService, useValue: youtube },
      ],
    }).compile();
    cron = moduleRef.get(VideosCron);
  });

  it('weekly() 호출 시 YouTubeSyncService.syncAllConferences 호출', async () => {
    youtube.syncAllConferences.mockResolvedValue({ synced: 30 });
    await cron.weekly();
    expect(youtube.syncAllConferences).toHaveBeenCalledTimes(1);
  });

  it('YouTubeSyncService 실패해도 throw 안 함 (cron이 죽지 않게)', async () => {
    youtube.syncAllConferences.mockRejectedValue(new Error('API quota'));
    await expect(cron.weekly()).resolves.not.toThrow();
  });
});
