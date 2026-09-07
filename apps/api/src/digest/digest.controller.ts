import { Controller, Get, Header, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { DailyDigestService } from './daily-digest.service';

@Controller('digest')
export class DigestController {
  constructor(private digest: DailyDigestService) {}

  /**
   * 오늘 다이제스트 반환. 미존재 시 명시적 JSON `null` 을 내려 계약을 고정한다.
   * (Nest 는 null 반환 시 빈 본문 200 을 보내 클라이언트가 res.json() 파싱
   * 예외에 의존하게 된다 — 문자열로 직접 직렬화해 항상 유효한 JSON 본문을 보장)
   */
  @Get('today')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async today(): Promise<string> {
    const d = await this.digest.getForDate(new Date());
    return JSON.stringify(d ?? null);
  }

  /** 수동 생성 트리거 (어드민 전용) */
  @Post('generate')
  @UseGuards(AdminGuard)
  async generate(@Query('force') force?: string) {
    return this.digest.generateForToday({ force: force === '1' });
  }
}
