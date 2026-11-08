// Cloudflare Worker용 @nestjs/config · @nestjs/bullmq · @nestjs/schedule 대체 모듈.
// 공개 읽기 API는 큐·예약 작업을 쓰지 않으므로 데코레이터와 클래스 모양만 맞춘다.
export class ConfigService {
  get<T = string>(key: string, fallback?: T): T | undefined {
    const value = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.[
      key
    ];
    return (value as T | undefined) ?? fallback;
  }
}

export const ConfigModule = { forRoot: () => ({}) };

export const InjectQueue = (): ParameterDecorator => () => undefined;
export const Processor = (): ClassDecorator => () => undefined;
export class WorkerHost {}
export const getQueueToken = (name: string) => `queue:${name}`;
export const BullModule = {
  forRoot: () => ({}),
  forRootAsync: () => ({}),
  registerQueue: () => ({}),
};

export const Cron = (): MethodDecorator => () => undefined;
export const ScheduleModule = { forRoot: () => ({}) };
export const CronExpression = {};

// @nestjs/core에서 쓰는 이름. 읽기 route는 guard를 쓰지 않으므로 모양만 맞춘다.
export class Reflector {
  get() {
    return undefined;
  }
  getAllAndOverride() {
    return undefined;
  }
}
export const APP_GUARD = 'APP_GUARD';
