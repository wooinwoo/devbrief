import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@pulse/db';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      this.logger.warn(`Prisma connect failed: ${(e as Error).message}. 환경변수 DATABASE_URL 확인.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
