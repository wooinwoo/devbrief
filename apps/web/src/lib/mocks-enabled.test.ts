import { afterEach, describe, expect, it, vi } from 'vitest';

// MOCKS_ENABLED 는 모듈 로드 시점의 env 로 결정되므로 케이스마다 모듈을 새로 로드한다.
async function load(nodeEnv: string, flag?: string): Promise<boolean> {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', nodeEnv);
  vi.stubEnv('NEXT_PUBLIC_ENABLE_MOCKS', flag ?? '');
  const mod = await import('./mocks-enabled');
  return mod.MOCKS_ENABLED;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('MOCKS_ENABLED', () => {
  it('프로덕션에서는 기본적으로 꺼진다 (mock 이 실데이터로 위장되면 안 됨)', async () => {
    expect(await load('production')).toBe(false);
  });

  it('프로덕션이라도 NEXT_PUBLIC_ENABLE_MOCKS=1 명시 opt-in 이면 켜진다', async () => {
    expect(await load('production', '1')).toBe(true);
  });

  it('개발/테스트 환경에서는 켜진다', async () => {
    expect(await load('development')).toBe(true);
    expect(await load('test')).toBe(true);
  });
});
