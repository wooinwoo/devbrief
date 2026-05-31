import { Controller, Get, Post, Query } from '@nestjs/common';
import { DailyDigestService } from './daily-digest.service';

@Controller('digest')
export class DigestController {
  constructor(private digest: DailyDigestService) {}

  /** 오늘 다이제스트 반환 (없으면 null) */
  @Get('today')
  async today() {
    return this.digest.getForDate(new Date());
  }

  /** 수동 생성 트리거 */
  @Post('generate')
  async generate(@Query('force') force?: string) {
    return this.digest.generateForToday({ force: force === '1' });
  }
}
