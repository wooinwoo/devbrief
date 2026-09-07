import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist/pages');
// Cleanup is limited to this generated output, never source or a caller-supplied path.
if (relative(root, output) !== `dist${sep}pages`) throw new Error('Invalid output path');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, 'dist/client'), output, {
  recursive: true,
  filter: (path) =>
    !relative(resolve(root, 'dist/client'), path)
      .split(sep)
      .some((p) => p.startsWith('.')),
});
// A single module preserves references back to the RSC entry, which Pages directory rebundling loses.
await build({
  entryPoints: [resolve(root, 'dist/server/index.js')],
  outfile: resolve(output, '_worker.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  minify: true,
  external: ['node:*', 'cloudflare:*'],
});
const bytes = gzipSync(await readFile(resolve(output, '_worker.js'))).byteLength;
if (bytes > 3 * 1024 * 1024) throw new Error('Worker exceeds the free-plan 3 MiB compressed limit');
const publicFiles = (await readdir(output, { withFileTypes: true }))
  .filter((entry) => !entry.name.startsWith('_') && entry.isFile())
  .map((entry) => `/${entry.name}`);
await writeFile(
  resolve(output, '_routes.json'),
  `${JSON.stringify(
    {
      version: 1,
      include: ['/*'],
      exclude: ['/_next/static/*', ...publicFiles],
    },
    null,
    2,
  )}\n`,
);
// Vite generates a Workers deployment redirect; Pages must use the root Pages config instead.
await rm(resolve(root, '.wrangler/deploy/config.json'), { force: true });
console.log(`Cloudflare Pages artifact ready: dist/pages (${Math.round(bytes / 1024)} KiB gzip)`);
