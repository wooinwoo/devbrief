import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GithubTrendingService } from './github-trending.service';
import { ReposController } from './repos.controller';
import { ReposCron } from './repos.cron';
import { ReposService } from './repos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReposController],
  providers: [ReposService, GithubTrendingService, ReposCron],
})
export class ReposModule {}
