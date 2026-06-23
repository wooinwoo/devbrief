import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DailyDigestCron } from './daily-digest.cron';
import { DailyDigestService } from './daily-digest.service';
import { DigestController } from './digest.controller';

@Module({
  imports: [PrismaModule, GeminiModule],
  controllers: [DigestController],
  providers: [DailyDigestService, DailyDigestCron],
})
export class DigestModule {}
