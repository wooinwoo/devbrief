import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { whenRedis } from '../common/bullmq.config';
import { PrismaModule } from '../prisma/prisma.module';
import { DailyDigestCron } from './daily-digest.cron';
import { DailyDigestService } from './daily-digest.service';
import { DigestController } from './digest.controller';

@Module({
  imports: [PrismaModule, GeminiModule],
  controllers: [DigestController],
  // 서빙(Redis 없음) 인스턴스에서는 수집성 Cron 미로드
  providers: [DailyDigestService, ...whenRedis(DailyDigestCron)],
})
export class DigestModule {}
