import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let prisma: { ping: jest.Mock };

  beforeEach(async () => {
    prisma = { ping: jest.fn() };
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

  describe('health/db (keep-alive ping)', () => {
    it('db up이면 ok 반환', async () => {
      prisma.ping.mockResolvedValue({ ok: true, latencyMs: 12 });
      const res = await appController.getDbHealth();
      expect(res).toMatchObject({ status: 'ok', db: 'up', latencyMs: 12 });
    });

    it('db down이면 503', async () => {
      prisma.ping.mockResolvedValue({ ok: false, latencyMs: 5000, error: 'timeout' });
      await expect(appController.getDbHealth()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
