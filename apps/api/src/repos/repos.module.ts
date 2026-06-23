import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReposController } from './repos.controller';
import { ReposService } from './repos.service';
import { GithubTrendingService } from './github-trending.service';
import { ReposCron } from './repos.cron';

@Module({
  imports: [PrismaModule],
  controllers: [ReposController],
  providers: [ReposService, GithubTrendingService, ReposCron],
})
export class ReposModule {}
