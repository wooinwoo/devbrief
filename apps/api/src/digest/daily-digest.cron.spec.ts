import { Test } from '@nestjs/testing';
import { DailyDigestCron } from './daily-digest.cron';
import { DailyDigestService } from './daily-digest.service';

describe('DailyDigestCron', () => {
  let cron: DailyDigestCron;
  let generateForToday: jest.Mock;

  beforeEach(async () => {
    generateForToday = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [DailyDigestCron, { provide: DailyDigestService, useValue: { generateForToday } }],
    }).compile();
    cron = moduleRef.get(DailyDigestCron);
  });

  it('정상 실행 시 digest 생성을 위임한다', async () => {
    generateForToday.mockResolvedValue({ intro: '', items: [] });
    await cron.daily();
    expect(generateForToday).toHaveBeenCalledTimes(1);
  });

  it('digest 생성이 실패해도 예외를 전파하지 않고 컨텍스트 로그를 남긴다', async () => {
    generateForToday.mockRejectedValue(new Error('db down'));
    const errorSpy = jest.spyOn((cron as any).logger, 'error').mockImplementation(() => {});

    await expect(cron.daily()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Digest cron failed: db down'),
      expect.any(String), // 스택
    );
  });
});
