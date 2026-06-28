import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { whenRedis } from '../common/bullmq.config';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConferenceDiscoveryCron } from './conference-discovery.cron';
import { ConferenceDiscoveryService } from './conference-discovery.service';
import { ConferenceImageSyncService } from './conference-image-sync.service';
import { ConferenceSeederService } from './conference-seeder.service';
import { ConferencesController } from './conferences.controller';

@Module({
  imports: [PrismaModule, CommonModule, GeminiModule],
  controllers: [ConferencesController],
  providers: [
    ConferenceSeederService,
    ConferenceImageSyncService,
    ConferenceDiscoveryService,
    // 서빙(Redis 없음) 인스턴스에서는 수집성 Cron 미로드
    ...whenRedis(ConferenceDiscoveryCron),
  ],
})
export class ConferencesModule {}
