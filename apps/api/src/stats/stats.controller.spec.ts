import { Test, type TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

describe('StatsController', () => {
  let controller: StatsController;
  let collection: jest.Mock;

  beforeEach(async () => {
    collection = jest.fn().mockResolvedValue({ articles: { total: 0 } });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [{ provide: StatsService, useValue: { collection } }],
    }).compile();
    controller = module.get(StatsController);
  });

  it('collection 은 서비스 집계를 그대로 위임한다', async () => {
    const res = await controller.collection();
    expect(collection).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ articles: { total: 0 } });
  });
});
