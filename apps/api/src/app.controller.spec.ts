import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('returns ok status with uptime', () => {
      const res = appController.getHealth();
      expect(res.status).toBe('ok');
      expect(typeof res.uptime).toBe('number');
    });
  });

  describe('health/db', () => {
    it('SELECT 1 성공 시 ok + latency 반환', async () => {
      const res = await appController.getDbHealth();
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(res.status).toBe('ok');
      expect(res.db).toBe('up');
      expect(typeof res.latencyMs).toBe('number');
    });

    it('DB 실패 시 503', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
      await expect(appController.getDbHealth()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
