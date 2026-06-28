import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { type DynamicModule, type Provider, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * REDIS_URL 유무로 BullMQ(큐/워커/Processor) 로드를 가른다.
 *
 * 배포(Render) "읽기 전용 서빙" 인스턴스는 Redis 가 없어도 정상 부팅해야 한다.
 * - REDIS_URL 없음 → forRoot / registerQueue / Processor / Cron 전부 미로드.
 *   (안 그러면 @Processor 가 init 시점에 Worker 를 띄워 localhost:6379 로 무한 재시도)
 * - REDIS_URL 있음 → 기존과 100% 동일하게 워커가 동작.
 *
 * 수집·요약·임베딩은 GitHub Actions 의 standalone CLI(cli.ts) 가 담당하므로
 * 런타임 api 서빙에는 BullMQ 가 필요 없다.
 *
 * NOTE: process.env 는 모듈 평가 시점에 읽는다. main.ts / cli.ts 가 최상단에서
 * `import 'dotenv/config'` 로 .env 를 먼저 로드하므로 데코레이터 평가 전에 값이 채워진다.
 */
export const isRedisEnabled = (): boolean => Boolean(process.env.REDIS_URL);

/**
 * Redis 없는 서빙 환경용 큐 스텁. add 호출 시 503 을 던져
 * "큐가 필요한 쓰기 엔드포인트"가 조용히 성공한 척하지 않고 비활성임을 알린다.
 */
export const disabledQueue = {
  add: (): Promise<never> => {
    throw new ServiceUnavailableException(
      '큐가 비활성화되었습니다 (REDIS_URL 미설정). 수집/요약/임베딩은 배치 CLI 가 담당합니다.',
    );
  },
};

/** REDIS 있을 때만 BullModule.forRootAsync 를 imports 에 포함. */
export function bullRootImports(): DynamicModule[] {
  if (!isRedisEnabled()) return [];
  return [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL')!;
        const parsed = new URL(url);
        return {
          connection: {
            host: parsed.hostname,
            port: Number(parsed.port) || 6379,
            username: parsed.username || undefined,
            password: parsed.password || undefined,
            tls: parsed.protocol === 'rediss:' ? {} : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
  ];
}

/** REDIS 있으면 registerQueue, 없으면 빈 배열(imports 용). */
export function registerQueues(...names: string[]): DynamicModule[] {
  if (!isRedisEnabled()) return [];
  return [BullModule.registerQueue(...names.map((name) => ({ name })))];
}

/**
 * REDIS 없을 때, 큐를 @InjectQueue 로 주입받는 서비스/컨트롤러가 뜨도록
 * 큐 토큰에 disabledQueue 스텁을 provide. REDIS 있으면 빈 배열.
 */
export function disabledQueueProviders(...names: string[]): Provider[] {
  if (isRedisEnabled()) return [];
  return names.map((name) => ({
    provide: getQueueToken(name),
    useValue: disabledQueue,
  }));
}

/** REDIS 있을 때만 provider 등록 (Processor, 큐 enqueue 하는 Cron 등). */
export function whenRedis(...providers: Provider[]): Provider[] {
  return isRedisEnabled() ? providers : [];
}
