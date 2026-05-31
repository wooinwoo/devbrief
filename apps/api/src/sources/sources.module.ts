import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { SourcesController } from './sources.controller';
import { RssDiscoveryService } from './rss-discovery.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SourcesController],
  providers: [RssDiscoveryService],
})
export class SourcesModule {}
