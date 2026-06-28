import { Module } from '@nestjs/common';
import { whenRedis } from '../common/bullmq.config';
import { PrismaModule } from '../prisma/prisma.module';
import { GithubTrendingService } from './github-trending.service';
import { ReposController } from './repos.controller';
import { ReposCron } from './repos.cron';
import { ReposService } from './repos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReposController],
  // 서빙(Redis 없음) 인스턴스에서는 수집성 Cron 미로드
  providers: [ReposService, GithubTrendingService, ...whenRedis(ReposCron)],
})
export class ReposModule {}
