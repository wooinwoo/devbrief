import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AnthropicModule } from '../ai/anthropic.module';
import { ConferencesController } from './conferences.controller';
import { ConferenceSeederService } from './conference-seeder.service';
import { ConferenceImageSyncService } from './conference-image-sync.service';
import { ConferenceDiscoveryService } from './conference-discovery.service';
import { ConferenceDiscoveryCron } from './conference-discovery.cron';

@Module({
  imports: [PrismaModule, CommonModule, AnthropicModule],
  controllers: [ConferencesController],
  providers: [
    ConferenceSeederService,
    ConferenceImageSyncService,
    ConferenceDiscoveryService,
    ConferenceDiscoveryCron,
  ],
})
export class ConferencesModule {}
