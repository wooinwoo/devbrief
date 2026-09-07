import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = {
  ...process.env,
  NEXT_PUBLIC_API_BASE:
    process.env.NEXT_PUBLIC_API_BASE || 'https://devbrief-api-8lyo.onrender.com/api/v1',
  NEXT_PUBLIC_API_PROXY_PATH: '/api/public',
};
const result = spawnSync(process.execPath, ['node_modules/vinext/dist/cli.js', 'build'], {
  cwd: root,
  env,
  stdio: 'inherit',
});
if (result.status !== 0) process.exit(result.status ?? 1);
await import('./package-pages.mjs');
