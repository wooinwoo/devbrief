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

  /**
   * Render sleep + Neon suspend 방지용 keep-alive 핑.
   * - /health 는 DB를 안 건드려서 Neon은 계속 잔다 → 이 엔드포인트가 SELECT 1 로 둘 다 깨운다.
   * - 외부 크론(UptimeRobot / GitHub Actions keep-alive.yml)이 5~10분마다 GET.
   * - DB 다운이어도 Render 자체는 살아있을 수 있으니 503으로 구분 (healthcheck /health는 200 유지).
   */
  @Get('health/db')
  async getDbHealth(): Promise<{
    status: string;
    db: string;
    latencyMs: number;
    uptime: number;
  }> {
    const result = await this.prisma.ping();
    if (!result.ok) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        db: 'down',
        latencyMs: result.latencyMs,
        uptime: process.uptime(),
      });
    }
    return {
      status: 'ok',
      db: 'up',
      latencyMs: result.latencyMs,
      uptime: process.uptime(),
    };
  }
}
