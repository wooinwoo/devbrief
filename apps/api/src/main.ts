// dotenv 강제 로드 — Prisma Client 가 ConfigModule 초기화 전에 process.env 를 읽기 때문
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // FRONTEND_URL: 콤마로 여러 origin 허용(정식 도메인 + Vercel 프리뷰 등). '*' 이면 전체 허용.
  const frontendEnv = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const origin =
    frontendEnv === '*'
      ? true
      : frontendEnv
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean);
  app.enableCors({ origin, credentials: true });
  // /api/v1 prefix — 단, 헬스체크(/health)는 prefix 없이 노출 (Railway healthcheckPath)
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Railway 등 PaaS 는 PORT 를 주입한다. 로컬은 API_PORT 유지, 둘 다 없으면 4000.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  // 0.0.0.0 바인딩 — 컨테이너 외부에서 접근 가능해야 한다 (기본 localhost 면 PaaS 헬스체크 실패).
  await app.listen(port, '0.0.0.0');
  console.log(`Devbrief API listening on port ${port} (prefix /api/v1, health /health)`);
}

bootstrap();
