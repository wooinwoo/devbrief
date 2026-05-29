# Pulse

> 매일 쏟아지는 기술 정보를 한 곳에서. AI가 정리하고 챗봇이 답한다.

## 구성

```
pulse/
  apps/
    web/      Next 15 App Router (사용자 UI + 챗봇)
    api/      NestJS (수집 파이프라인 + RAG 백엔드)
  packages/
    shared/   공유 TypeScript 타입
    db/       Prisma 스키마 + 마이그레이션
  docs/
    PRD.md    제품 정의 v0.1
```

## 기술 스택

- Next 15 App Router / NestJS 11 / TypeScript 5.8
- PostgreSQL + pgvector / Redis / BullMQ
- Claude API (Haiku 4.5 요약 / Sonnet 4.6 챗봇)
- Voyage Embedding / pnpm workspace / Biome

## 빠른 시작

```bash
# 1. 의존성
pnpm install

# 2. 환경변수
cp .env.example .env
# .env 에 Neon, Upstash, Anthropic 키 넣기

# 3. DB 마이그레이션
pnpm db:migrate

# 4. 개발 서버 (web + api 동시)
pnpm dev
```

## 문서

- [PRD v0.1](./docs/PRD.md)
