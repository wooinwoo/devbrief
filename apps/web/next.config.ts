import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @devbrief/shared 는 빌드 산출물 없이 TS 소스(main: ./src/index.ts)를 그대로 노출하는
  // 워크스페이스 패키지 — Next 가 직접 트랜스파일하도록 명시한다.
  transpilePackages: ['@devbrief/shared'],
};

export default nextConfig;
