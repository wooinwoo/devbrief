// devbrief 공개 읽기 API Worker를 dist/로 묶는다.
// 1) packages/db 스키마로 Worker(workerd)용 Prisma 7 client를 생성한다.
// 2) apps/api의 controller·service를 Nest·서버 전용 라이브러리 대체 모듈과 함께 번들한다.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(root, '../api');
const schemaPath = resolve(root, '../../packages/db/prisma/schema.prisma');
const generatedDir = resolve(root, 'generated');
const outDir = resolve(root, 'dist');
const shim = (name) => resolve(root, 'src/shims', name);

function generatePrismaClient() {
  const schema = readFileSync(schemaPath, 'utf8');
  const generator = /generator client \{[^}]*\}/;
  if (!generator.test(schema))
    throw new Error('schema.prisma에서 generator client를 찾지 못했습니다.');
  const output = resolve(generatedDir, 'prisma').replaceAll('\\', '/');
  const converted = schema
    .replace(
      generator,
      `generator client {\n  provider        = "prisma-client"\n  output          = "${output}"\n  runtime         = "workerd"\n  previewFeatures = ["postgresqlExtensions"]\n}`,
    )
    // Prisma 7은 연결 주소를 스키마가 아니라 실행 시 어댑터로 받는다.
    .replace(/^\s*url\s*=\s*env\([^)]*\)\s*$/m, '');
  rmSync(generatedDir, { recursive: true, force: true });
  const schemaDir = resolve(generatedDir, '.schema');
  mkdirSync(schemaDir, { recursive: true });
  writeFileSync(resolve(schemaDir, 'schema.prisma'), converted);
  const bin = resolve(root, 'node_modules/.bin');
  execFileSync('prisma', ['generate', '--schema', resolve(schemaDir, 'schema.prisma')], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PATH: `${bin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
    },
  });
  rmSync(schemaDir, { recursive: true, force: true });
}

const aliases = {
  '@nestjs/common': shim('nest-common.ts'),
  '@nestjs/core': shim('nest-extras.ts'),
  '@nestjs/config': shim('nest-extras.ts'),
  '@nestjs/bullmq': shim('nest-extras.ts'),
  '@nestjs/schedule': shim('nest-extras.ts'),
  '@devbrief/db': shim('db.ts'),
};
// 공개 읽기 route에서는 호출되지 않는 서버 전용 라이브러리.
const unusedModules =
  /^(bullmq|ioredis|youtubei\.js|cheerio|rss-parser|@google\/genai|express)(\/.*)?$/;

const plugin = {
  name: 'devbrief-edge',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^@nestjs\/|^@devbrief\/db$/ }, (args) =>
      aliases[args.path] ? { path: aliases[args.path] } : undefined,
    );
    pluginBuild.onResolve({ filter: unusedModules }, () => ({ path: shim('unused-module.ts') }));
    pluginBuild.onResolve({ filter: /\.wasm\?module$/ }, (args) => {
      const file = resolve(args.resolveDir, args.path.replace(/\?module$/, ''));
      const name = file.split(/[\\/]/).pop();
      copyFileSync(file, resolve(outDir, name));
      return { path: `./${name}`, external: true };
    });
    pluginBuild.onResolve({ filter: /prisma\.service$/ }, (args) =>
      resolve(args.resolveDir).startsWith(apiDir) ? { path: shim('prisma-service.ts') } : undefined,
    );
  },
};

generatePrismaClient();
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(outDir, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2023',
  conditions: ['workerd', 'worker', 'browser', 'import', 'default'],
  mainFields: ['browser', 'module', 'main'],
  external: ['node:*', 'cloudflare:*'],
  plugins: [plugin],
  minify: true,
  logLevel: 'warning',
});

if (!existsSync(resolve(outDir, 'index.js'))) throw new Error('Worker 번들을 만들지 못했습니다.');
console.log('Worker 번들 완료:', outDir);
