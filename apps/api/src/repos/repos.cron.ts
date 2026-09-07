import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReposService } from './repos.service';

@Injectable()
export class ReposCron {
  private readonly logger = new Logger(ReposCron.name);

  constructor(private repos: ReposService) {}

  // 매일 08:30 (Asia/Seoul). 트렌딩은 하루 단위로 충분.
  @Cron('30 8 * * *', { timeZone: 'Asia/Seoul' })
  async daily() {
    this.logger.log('GitHub Trending sync triggered');
    try {
      const result = await this.repos.refreshAll();
      this.logger.log(`Trending sync done: daily=${result.daily} weekly=${result.weekly}`);
    } catch (e) {
      // 메시지만 남기면 스택이 유실된다 — 라이브러리 기본 catch 보다 정보가 줄지 않게 스택 포함.
      this.logger.error(`Trending sync failed: ${(e as Error).message}`, (e as Error).stack);
    }
  }
}
