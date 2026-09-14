import { PrismaClient } from '@devbrief/db';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      this.logger.warn(
        `Prisma connect failed: ${(e as Error).message}. 환경변수 DATABASE_URL 확인.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Render 무료 sleep + Neon suspend 깨우기용 경량 핑.
   * 어떤 HTTP 요청이든 Render를 깨우지만, DB를 건드려야 Neon compute도 깨어난다.
   * 실패해도 throw하지 않고 호출자가 503으로 변환한다 (Healthcheck /health는 영향 없음).
   */
  async ping(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const startedAt = Date.now();
    try {
      await this.$queryRawUnsafe('SELECT 1');
      return { ok: true, latencyMs: Date.now() - startedAt };
    } catch (e) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: (e as Error).message,
      };
    }
  }
}
