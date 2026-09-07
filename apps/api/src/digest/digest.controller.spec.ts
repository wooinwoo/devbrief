import { Test, type TestingModule } from '@nestjs/testing';
import { DailyDigestService } from './daily-digest.service';
import { DigestController } from './digest.controller';

describe('DigestController', () => {
  let controller: DigestController;
  let getForDate: jest.Mock;
  let generateForToday: jest.Mock;

  beforeEach(async () => {
    getForDate = jest.fn();
    generateForToday = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DigestController],
      providers: [
        {
          provide: DailyDigestService,
          useValue: { getForDate, generateForToday },
        },
      ],
    }).compile();
    controller = module.get(DigestController);
  });

  describe('today', () => {
    it('미존재 시 빈 본문이 아니라 명시적 JSON null 을 반환한다', async () => {
      getForDate.mockResolvedValue(null);
      const body = await controller.today();
      expect(body).toBe('null');
      expect(JSON.parse(body)).toBeNull();
    });

    it('존재 시 다이제스트를 JSON 직렬화해 반환한다 (Date → ISO)', async () => {
      const row = {
        id: 'd1',
        date: new Date('2026-07-19T15:00:00.000Z'),
        intro: '인트로',
        items: [{ articleId: 'a1', headline: 'h', takeaway: 't' }],
        generatedAt: new Date('2026-07-20T00:30:00.000Z'),
      };
      getForDate.mockResolvedValue(row);

      const body = await controller.today();
      const parsed = JSON.parse(body);

      expect(parsed.id).toBe('d1');
      expect(parsed.date).toBe('2026-07-19T15:00:00.000Z');
      expect(parsed.items).toEqual(row.items);
    });
  });

  describe('generate', () => {
    it('force=1 이면 force 옵션을 켠다', async () => {
      generateForToday.mockResolvedValue({ intro: '', items: [] });
      await controller.generate('1');
      expect(generateForToday).toHaveBeenCalledWith({ force: true });
    });

    it('force 미지정이면 force=false', async () => {
      generateForToday.mockResolvedValue({ intro: '', items: [] });
      await controller.generate(undefined);
      expect(generateForToday).toHaveBeenCalledWith({ force: false });
    });
  });
});
