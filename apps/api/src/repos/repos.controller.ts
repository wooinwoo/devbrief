import { Controller, Get, Post, Query } from '@nestjs/common';
import { ReposService } from './repos.service';

@Controller('repos')
export class ReposController {
  constructor(private repos: ReposService) {}

  // GET /api/v1/repos?period=weekly&language=Python&category=ai
  @Get()
  list(
    @Query('period') period?: string,
    @Query('language') language?: string,
    @Query('category') category?: string,
  ) {
    return this.repos.list({ period, language, category });
  }

  // POST /api/v1/repos/sync — 수동 갱신
  @Post('sync')
  sync() {
    return this.repos.refreshAll();
  }
}
