# Devbrief API (NestJS) — Railway/컨테이너 배포용 멀티스테이지 Dockerfile.
# 빌드 컨텍스트는 모노레포 루트여야 한다 (pnpm workspace 전체가 필요).
#   docker build -f apps/api/Dockerfile -t devbrief-api .
#
# 런타임은 node:24 — 루트 패키지 @devbrief/db 의 main 이 src/index.ts(.ts) 라
# Node 24 의 TypeScript strip-types 로 그대로 require 된다. 로컬 동작과 동일.

# ── 1. deps: 전체 워크스페이스 의존성 설치 + Prisma client 생성 ─────────────
FROM node:24-slim AS deps
# Prisma 엔진(debian-openssl-3.0.x)에 OpenSSL 필요
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# 워크스페이스 매니페스트만 먼저 복사 → 레이어 캐시 활용
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile

# 소스 복사 후 Prisma client 생성
COPY . .
RUN pnpm --filter @devbrief/db run generate

# ── 2. build: NestJS 빌드 → dist 산출 ──────────────────────────────────────
FROM deps AS build
WORKDIR /app
RUN pnpm --filter @devbrief/api run build

# ── 3. runner: 런타임 이미지 ───────────────────────────────────────────────
FROM node:24-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

# 빌드 산출물 + 설치된 워크스페이스(node_modules 심링크 포함) + Prisma 스키마/마이그레이션 복사
COPY --from=build /app ./

WORKDIR /app/apps/api
EXPOSE 4000

# Railway 가 PORT 를 주입한다. main.ts 가 process.env.PORT 를 우선 사용.
# 마이그레이션은 배포 절차(DEPLOY.md)에서 `pnpm db:migrate:deploy` 로 별도 실행한다.
CMD ["node", "dist/main"]
