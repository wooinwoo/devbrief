import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`Pulse API listening on http://localhost:${port}/api/v1`);
}

bootstrap();
