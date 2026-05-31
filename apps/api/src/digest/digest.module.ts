import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiModule } from '../ai/gemini.module';
import { DailyDigestService } from './daily-digest.service';
import { DailyDigestCron } from './daily-digest.cron';
import { DigestController } from './digest.controller';

@Module({
  imports: [PrismaModule, GeminiModule],
  controllers: [DigestController],
  providers: [DailyDigestService, DailyDigestCron],
})
export class DigestModule {}
