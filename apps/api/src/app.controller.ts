import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Railway healthcheckPath 용 — global prefix(/api/v1) 에서 제외되어 /health 로 노출.
  // 외부 의존성(DB/Redis) 없이 프로세스 생존만 확인 (부팅 직후/일시 장애에도 통과).
  @Get('health')
  getHealth(): { status: string; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }
}
