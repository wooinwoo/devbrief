// devbrief 공개 읽기 API를 Cloudflare Worker에서 실행한다.
// apps/api의 controller·service를 Nest 없이 그대로 연결하고 GET route만 연다.
// 수집·요약·관리자 기능은 GitHub Actions CLI와 기존 서버 쪽에 그대로 둔다.
import { PrismaNeon } from '@prisma/adapter-neon';
import { AppController } from '../../api/src/app.controller';
import { AppService } from '../../api/src/app.service';
import { ArticlesController } from '../../api/src/articles/articles.controller';
import { ArticlesService } from '../../api/src/articles/articles.service';
import { ConferencesController } from '../../api/src/conferences/conferences.controller';
import { DailyDigestService } from '../../api/src/digest/daily-digest.service';
import { DigestController } from '../../api/src/digest/digest.controller';
import { ReposController } from '../../api/src/repos/repos.controller';
import { ReposService } from '../../api/src/repos/repos.service';
import { SourcesController } from '../../api/src/sources/sources.controller';
import { StatsController } from '../../api/src/stats/stats.controller';
import { StatsService } from '../../api/src/stats/stats.service';
import { VideosController } from '../../api/src/videos/videos.controller';
import { PrismaClient } from '../generated/prisma/client';
import { HttpException, type ParamSpec, getMeta } from './shims/nest-common';

interface Env {
  DATABASE_URL: string;
}

interface Context {
  waitUntil(promise: Promise<unknown>): void;
}

type Handler = (...args: unknown[]) => unknown;

interface Route {
  pattern: RegExp;
  keys: string[];
  controllerType: abstract new (...args: never[]) => object;
  handlerName: string;
  handler: Handler;
}

// health/db가 쓰는 ping을 PrismaService와 같은 모양으로 붙인다.
class EdgePrisma extends PrismaClient {
  async ping() {
    const startedAt = Date.now();
    try {
      await this.$queryRawUnsafe('SELECT 1');
      return { ok: true, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - startedAt, error: (error as Error).message };
    }
  }
}

// 읽기 route가 쓰지 않는 의존성(영상 동기화, 큐, 이미지 수집 등)은 비워 둔다.
const unused = null as never;
// API 키가 없는 서버와 같은 동작: AI 요약은 건너뛰고 규칙 기반 결과를 쓴다.
const gemini = { isAvailable: () => false } as never;

function buildControllers(prisma: never) {
  return [
    new AppController(new AppService(), prisma),
    new ArticlesController(prisma, new ArticlesService(prisma)),
    new VideosController(prisma, unused, unused, unused),
    new ConferencesController(prisma, unused, unused),
    new ReposController(new ReposService(prisma, unused)),
    new SourcesController(prisma, unused),
    new StatsController(new StatsService(prisma)),
    new DigestController(new DailyDigestService(gemini, prisma)),
  ];
}

const controllerTypes = [
  AppController,
  ArticlesController,
  VideosController,
  ConferencesController,
  ReposController,
  SourcesController,
  StatsController,
  DigestController,
];

// main.ts와 같은 규칙: 전역 prefix는 api/v1, health 계열만 prefix 없이 연다.
const unprefixed = new Set(['health', 'health/db']);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compile(path: string) {
  const keys: string[] = [];
  const source = path
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (!segment.startsWith(':')) return escapeRegExp(segment);
      keys.push(segment.slice(1));
      return '([^/]+)';
    })
    .join('/');
  return { pattern: new RegExp(`^/${source}/?$`), keys };
}

const routes: Route[] = [];
for (const controllerType of controllerTypes) {
  const prefix = getMeta<string>(controllerType, 'prefix') ?? '';
  const prototype = controllerType.prototype as Record<string, unknown>;
  for (const name of Object.getOwnPropertyNames(prototype)) {
    const handler = prototype[name];
    if (name === 'constructor' || typeof handler !== 'function') continue;
    const meta = getMeta<{ method: string; path: string }>(handler, 'route');
    // 공개 읽기 API이므로 인증 guard가 없는 GET만 연다.
    if (meta?.method !== 'GET' || getMeta<unknown[]>(handler, 'guards') !== undefined) continue;
    const local = [prefix, meta.path].filter(Boolean).join('/');
    const { pattern, keys } = compile(unprefixed.has(local) ? local : `api/v1/${local}`);
    routes.push({
      pattern,
      keys,
      controllerType: controllerType as unknown as Route['controllerType'],
      handlerName: name,
      handler: handler as Handler,
    });
  }
}
// 고정 경로(articles/batch)가 파라미터 경로(articles/:id)보다 먼저 맞도록 정렬한다.
routes.sort((left, right) => left.keys.length - right.keys.length);

function json(status: number, body: unknown, headers: Headers) {
  headers.set('content-type', 'application/json; charset=utf-8');
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? null);
  return new Response(text, { status, headers });
}

async function handle(request: Request, env: Env, context: Context): Promise<Response> {
  const url = new URL(request.url);
  const headers = new Headers();
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json(405, { statusCode: 405, message: '읽기 전용 API입니다.' }, headers);
  }

  let matched: { route: Route; params: Record<string, string> } | undefined;
  for (const route of routes) {
    const match = route.pattern.exec(url.pathname);
    if (match === null) continue;
    matched = {
      route,
      params: Object.fromEntries(
        route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1]!)]),
      ),
    };
    break;
  }
  if (matched === undefined) {
    return json(
      404,
      { statusCode: 404, message: `Cannot GET ${url.pathname}`, error: 'Not Found' },
      headers,
    );
  }

  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    const current = query[key];
    if (current === undefined) query[key] = value;
    else query[key] = [...(Array.isArray(current) ? current : [current]), value];
  });
  const requestHeaders: Record<string, string> = {};
  request.headers.forEach((value, name) => {
    requestHeaders[name.toLowerCase()] = value;
  });
  const httpResponse = {
    setHeader(name: string, value: string | number | readonly string[]) {
      headers.set(name, Array.isArray(value) ? value.join(', ') : String(value));
      return httpResponse;
    },
    header(name: string, value: string | number) {
      headers.set(name, String(value));
      return httpResponse;
    },
  };

  // Neon 연결은 요청 범위를 벗어나 재사용하면 안 되므로 요청마다 client를 만든다.
  const prisma = new EdgePrisma({
    adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }),
  });
  try {
    const { route, params } = matched;
    const controller = buildControllers(prisma as never).find(
      (item) => item instanceof route.controllerType,
    )!;
    const args: unknown[] = [];
    for (const spec of getMeta<ParamSpec[]>(route.handler, 'params') ?? []) {
      if (spec.kind === 'query') args[spec.index] = spec.name ? query[spec.name] : query;
      else if (spec.kind === 'param') args[spec.index] = spec.name ? params[spec.name] : params;
      else if (spec.kind === 'headers')
        args[spec.index] = spec.name ? requestHeaders[spec.name.toLowerCase()] : requestHeaders;
      else if (spec.kind === 'res') args[spec.index] = httpResponse;
      else if (spec.kind === 'req')
        args[spec.index] = { method: 'GET', headers: requestHeaders, query, params };
      else args[spec.index] = undefined;
    }
    for (const [name, value] of getMeta<[string, string][]>(route.handler, 'headers') ?? []) {
      headers.set(name, value);
    }
    const result = await (controller as Record<string, Handler>)[route.handlerName]!(...args);
    const status = getMeta<number>(route.handler, 'httpCode') ?? 200;
    return json(status, result, headers);
  } catch (error) {
    if (error instanceof HttpException) {
      return json(error.getStatus(), error.getResponse(), headers);
    }
    console.error('[api]', error);
    return json(500, { statusCode: 500, message: 'Internal server error' }, headers);
  } finally {
    context.waitUntil(prisma.$disconnect().catch(() => undefined));
  }
}

export default {
  fetch: handle,
};
