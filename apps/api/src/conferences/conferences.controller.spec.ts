import type { ConferenceDiscoveryService } from './conference-discovery.service';
import type { ConferenceImageSyncService } from './conference-image-sync.service';
import { ConferencesController } from './conferences.controller';

describe('ConferencesController', () => {
  let controller: ConferencesController;
  let prisma: {
    conference: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let imageSync: { syncAll: jest.Mock };
  let discovery: { discover: jest.Mock };

  beforeEach(() => {
    prisma = {
      conference: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    imageSync = { syncAll: jest.fn().mockResolvedValue({}) };
    discovery = { discover: jest.fn() };

    controller = new ConferencesController(
      prisma as never,
      imageSync as unknown as ConferenceImageSyncService,
      discovery as unknown as ConferenceDiscoveryService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('list upcoming=1', () => {
    it.each([
      ['1000', 1000],
      ['999999', 1000],
      ['-1', 50],
      ['abc', 50],
      ['1.5', 50],
    ])('목록 크기 %s를 %i로 제한한다', async (limit, take) => {
      await controller.list('1', 'PROPOSED', limit);
      expect(prisma.conference.findMany.mock.calls[0][0].take).toBe(take);
    });
    it('KST 오늘 자정 기준 startDate/endDate OR 필터 — 당일 행사가 KST 자정까지 유지', async () => {
      // 2026-07-15 12:00 KST (= 03:00 UTC). 행사 startDate 는 UTC 자정으로 저장됨.
      jest.useFakeTimers().setSystemTime(new Date('2026-07-15T03:00:00Z'));

      await controller.list('1');

      const kstMidnight = new Date('2026-07-14T15:00:00.000Z'); // 2026-07-15 00:00 KST
      expect(prisma.conference.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          OR: [{ startDate: { gte: kstMidnight } }, { endDate: { gte: kstMidnight } }],
        },
        orderBy: { startDate: 'asc' },
        take: 50,
      });
    });

    it('당일 행사(UTC 자정 저장)는 당일 낮에도 하한을 통과한다 (c52 회귀)', async () => {
      // 종전 gte: new Date() 는 당일 09:00 KST 부터 당일 행사를 탈락시켰다
      jest.useFakeTimers().setSystemTime(new Date('2026-07-15T05:30:00Z')); // 14:30 KST

      await controller.list('1');

      const where = prisma.conference.findMany.mock.calls[0][0].where as {
        OR: Array<{ startDate?: { gte: Date } }>;
      };
      const lowerBound = where.OR[0].startDate?.gte as Date;
      const todayEventStart = new Date('2026-07-15T00:00:00Z'); // 당일 행사 저장값
      expect(todayEventStart.getTime()).toBeGreaterThanOrEqual(lowerBound.getTime());
    });

    it('upcoming 미지정이면 날짜 필터 없음', async () => {
      await controller.list(undefined);
      expect(prisma.conference.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'asc' },
        take: 50,
      });
    });

    it('status 쿼리 지정 시 해당 상태로 조회', async () => {
      await controller.list(undefined, 'PROPOSED');
      const where = prisma.conference.findMany.mock.calls[0][0].where as {
        status: string;
      };
      expect(where.status).toBe('PROPOSED');
    });
  });
});
