import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RssDiscoveryService } from './rss-discovery.service';
import { SourcesController } from './sources.controller';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SourcesController],
  providers: [RssDiscoveryService],
})
export class SourcesModule {}
