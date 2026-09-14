import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Railway healthcheckPath 용 — global prefix(/api/v1) 에서 제외되어 /health 로 노출.
  // 외부 의존성(DB/Redis) 없이 프로세스 생존만 확인 (부팅 직후/일시 장애에도 통과).
  @Get('health')
  getHealth(): { status: string; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }

  // 외부 keepalive( cron-job.org 등 )용 — Neon DB까지 깨운다.
  // SELECT 1 한 방이라 테이블 스캔 없이 커넥트 + 왕복만 확인한다.
  // DB 다운이면 503으로 알려줘 Render 생존과 구분한다.
  // global prefix 제외되어 /health/db 로 노출 (main.ts exclude 참고).
  @Get('health/db')
  async getDbHealth(): Promise<{
    status: string;
    db: string;
    latencyMs: number;
    uptime: number;
  }> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      throw new ServiceUnavailableException(`db unreachable: ${(e as Error).message}`);
    }
    return {
      status: 'ok',
      db: 'up',
      latencyMs: Date.now() - started,
      uptime: process.uptime(),
    };
  }
}
