// Cloudflare Worker용 @nestjs/common 대체 모듈.
// apps/api의 controller·service를 그대로 쓰기 위해 데코레이터는 route 메타데이터만 기록하고,
// 예외 클래스는 Nest와 같은 status·응답 본문을 만든다.
const metadataStore = new WeakMap<object, Map<string, unknown>>();

function setMeta(target: object, key: string, value: unknown) {
  let entries = metadataStore.get(target);
  if (entries === undefined) {
    entries = new Map();
    metadataStore.set(target, entries);
  }
  entries.set(key, value);
}

export function getMeta<T>(target: object, key: string): T | undefined {
  return metadataStore.get(target)?.get(key) as T | undefined;
}

type Decorator = (
  target: object,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor,
) => void;

function owner(target: object, descriptor?: PropertyDescriptor) {
  return (descriptor?.value as object | undefined) ?? target;
}

function decorate(key: string, value: unknown): Decorator {
  return (target, _propertyKey, descriptor) => setMeta(owner(target, descriptor), key, value);
}

const route =
  (method: string) =>
  (path = '') =>
    decorate('route', { method, path });

export const Injectable = (): ClassDecorator => () => undefined;
export const Module = (): ClassDecorator => () => undefined;
export const Global = (): ClassDecorator => () => undefined;
export const Controller =
  (prefix = ''): ClassDecorator =>
  (target) =>
    setMeta(target, 'prefix', prefix);
export const Get = route('GET');
export const Post = route('POST');
export const Patch = route('PATCH');
export const Put = route('PUT');
export const Delete = route('DELETE');
export const HttpCode = (status: number) => decorate('httpCode', status);
export const SetMetadata = (key: string, value: unknown) => decorate(key, value);
export const Inject = (): ParameterDecorator => () => undefined;

export const Header =
  (name: string, value: string): Decorator =>
  (target, _key, descriptor) => {
    const target_ = owner(target, descriptor);
    setMeta(target_, 'headers', [
      ...(getMeta<[string, string][]>(target_, 'headers') ?? []),
      [name, value],
    ]);
  };

export const UseGuards =
  (...guards: unknown[]): Decorator =>
  (target, _key, descriptor) => {
    const target_ = owner(target, descriptor);
    setMeta(target_, 'guards', [...(getMeta<unknown[]>(target_, 'guards') ?? []), ...guards]);
  };

export type ParamKind = 'body' | 'query' | 'param' | 'req' | 'res' | 'headers';
export interface ParamSpec {
  index: number;
  kind: ParamKind;
  name?: string;
}

function paramDecorator(kind: ParamKind, name?: string): ParameterDecorator {
  return (target, propertyKey, index) => {
    if (propertyKey === undefined) return;
    const method = (target as Record<string | symbol, object>)[propertyKey]!;
    setMeta(method, 'params', [
      ...(getMeta<ParamSpec[]>(method, 'params') ?? []),
      { index, kind, name },
    ]);
  };
}

// 파이프 인자(ParseIntPipe 등)는 받지 않는다. 데코레이터 이름만 맞춘다.
export const Body = (name?: string) =>
  paramDecorator('body', typeof name === 'string' ? name : undefined);
export const Query = (name?: string) =>
  paramDecorator('query', typeof name === 'string' ? name : undefined);
export const Param = (name?: string) =>
  paramDecorator('param', typeof name === 'string' ? name : undefined);
export const Headers = (name?: string) =>
  paramDecorator('headers', typeof name === 'string' ? name : undefined);
export const Req = () => paramDecorator('req');
export const Res = () => paramDecorator('res');

export class HttpException extends Error {
  constructor(
    private readonly body: string | Record<string, unknown>,
    private readonly status: number,
  ) {
    super(typeof body === 'string' ? body : String(body.message ?? ''));
  }

  getStatus() {
    return this.status;
  }

  getResponse() {
    return typeof this.body === 'string'
      ? { statusCode: this.status, message: this.body }
      : this.body;
  }
}

function httpError(status: number, fallback: string) {
  return class extends HttpException {
    constructor(body: string | Record<string, unknown> = fallback) {
      super(body, status);
    }
  };
}

export const BadRequestException = httpError(400, 'Bad Request');
export const UnauthorizedException = httpError(401, 'Unauthorized');
export const ForbiddenException = httpError(403, 'Forbidden');
export const NotFoundException = httpError(404, 'Not Found');
export const ConflictException = httpError(409, 'Conflict');
export const ServiceUnavailableException = httpError(503, 'Service Unavailable');
export const InternalServerErrorException = httpError(500, 'Internal Server Error');

export class ValidationPipe {
  constructor(_options?: unknown) {
    void _options;
  }
}

// Nest Logger와 같은 모양. Worker 로그(wrangler tail)로 내보낸다.
export class Logger {
  constructor(private readonly context = '') {}
  log(message: unknown) {
    console.log(`[${this.context}]`, message);
  }
  warn(message: unknown) {
    console.warn(`[${this.context}]`, message);
  }
  error(message: unknown, ...rest: unknown[]) {
    console.error(`[${this.context}]`, message, ...rest);
  }
  debug() {}
  verbose() {}
  static log(message: unknown) {
    console.log(message);
  }
  static warn(message: unknown) {
    console.warn(message);
  }
  static error(message: unknown) {
    console.error(message);
  }
}

export interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

export interface ExecutionContext {
  switchToHttp(): { getRequest<T>(): T; getResponse<T>(): T };
  getHandler(): object;
  getClass(): object;
}

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
