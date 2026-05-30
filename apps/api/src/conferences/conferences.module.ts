import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { ConferencesController } from './conferences.controller';
import { ConferenceSeederService } from './conference-seeder.service';
import { ConferenceImageSyncService } from './conference-image-sync.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ConferencesController],
  providers: [ConferenceSeederService, ConferenceImageSyncService],
})
export class ConferencesModule {}
