import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private stats: StatsService) {}

  // GET /api/v1/stats/collection — 수집 통계 집계 (어드민 대시보드 위젯용).
  // 단순 카운트 집계라 공개 GET 으로 둔다(쓰기 없음). 어드민 화면은 비밀번호 프록시 뒤에 있다.
  @Get('collection')
  collection() {
    return this.stats.collection();
  }
}
