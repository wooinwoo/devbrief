import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConferencesController } from './conferences.controller';
import { ConferenceSeederService } from './conference-seeder.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConferencesController],
  providers: [ConferenceSeederService],
})
export class ConferencesModule {}
