// axios 를 mock — c33 회귀(타임아웃 인스턴스)와 syncChannel 동작을 네트워크 없이 검증
jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

import type { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { PrismaService } from '../prisma/prisma.service';
import { YouTubeSyncService, parseIsoDuration } from './youtube-sync.service';

describe('parseIsoDuration', () => {
  it('PT0S → 0', () => {
    expect(parseIsoDuration('PT0S')).toBe(0);
  });

  it('PT42S → 42', () => {
    expect(parseIsoDuration('PT42S')).toBe(42);
  });

  it('PT5M → 300', () => {
    expect(parseIsoDuration('PT5M')).toBe(300);
  });

  it('PT42M18S → 2538', () => {
    expect(parseIsoDuration('PT42M18S')).toBe(2538);
  });

  it('PT1H → 3600', () => {
    expect(parseIsoDuration('PT1H')).toBe(3600);
  });

  it('PT1H2M3S → 3723', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
  });

  it('PT2H30M → 9000', () => {
    expect(parseIsoDuration('PT2H30M')).toBe(9000);
  });

  it('유효하지 않은 입력은 0', () => {
    expect(parseIsoDuration('INVALID')).toBe(0);
    expect(parseIsoDuration('')).toBe(0);
  });
});

describe('YouTubeSyncService', () => {
  let get: jest.Mock;
  let prisma: {
    video: { upsert: jest.Mock; updateMany: jest.Mock };
    conference: { updateMany: jest.Mock };
  };
  let service: YouTubeSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    get = jest.fn();
    (axios.create as jest.Mock).mockReturnValue({ get });
    prisma = {
      video: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      conference: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const config = { get: jest.fn().mockReturnValue('test-api-key') };
    service = new YouTubeSyncService(
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  // c33: YouTube Data API 호출이 소켓 행에 걸리면 주간 크론/CLI 가 무한 대기 — 타임아웃 필수
  it('axios 인스턴스에 15s 타임아웃을 건다', () => {
    expect(axios.create).toHaveBeenCalledWith({ timeout: 15_000 });
  });

  describe('syncChannel', () => {
    const searchItems = [
      {
        id: { videoId: 'vid00000001' },
        snippet: {
          title: 'T1',
          channelTitle: 'Chan',
          publishedAt: '2026-01-01T00:00:00Z',
          thumbnails: { high: { url: 'https://img/1.jpg' } },
        },
      },
    ];
    const detailItems = [
      {
        id: 'vid00000001',
        contentDetails: { duration: 'PT10M' },
        statistics: { viewCount: '5' },
        snippet: { description: 'full description' },
      },
    ];

    beforeEach(() => {
      get
        .mockResolvedValueOnce({ data: { items: searchItems } })
        .mockResolvedValueOnce({ data: { items: detailItems } });
    });

    it('search + detail 로 영상을 upsert 한다', async () => {
      const count = await service.syncChannel('conf-1', 'chan-1', 10);
      expect(count).toBe(1);
      expect(prisma.video.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.video.upsert.mock.calls[0][0].create.conferenceId).toBe('conf-1');
    });

    // c50: 수동 추가(/videos/add)로 conferenceId 없이 저장된 영상을 sync 가 연결해줘야 함
    it('conferenceId 가 null 인 기존 영상만 이 컨퍼런스로 일괄 연결', async () => {
      await service.syncChannel('conf-1', 'chan-1', 10);
      expect(prisma.video.updateMany).toHaveBeenCalledWith({
        where: { videoId: { in: ['vid00000001'] }, conferenceId: null },
        data: { conferenceId: 'conf-1' },
      });
    });

    // c50 보호 조건: 기존 non-null 연결을 update 분기가 덮어쓰지 않는다
    it('upsert update 분기에는 conferenceId 를 넣지 않아 기존 연결을 보존', async () => {
      await service.syncChannel('conf-1', 'chan-1', 10);
      expect(prisma.video.upsert.mock.calls[0][0].update).not.toHaveProperty('conferenceId');
    });
  });
});
