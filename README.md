# Pulse

> 매일 쏟아지는 기술 정보를 한 곳에서. AI가 정리하고 챗봇이 답한다.

매일 09:00 KST 에 RSS 30+ 글을 수집해 요약/임베딩 후, 자연어 질문에
pgvector 기반 RAG 로 답합니다. 컨퍼런스/영상 메타데이터도 자동 발견.

## 구성

```
pulse/
  apps/
    web/      Next 16 App Router (사용자 UI + 챗봇 + 어드민)
    api/      NestJS (수집 파이프라인 + RAG + 자동 발견)
  packages/
    shared/   공유 TypeScript 타입
    db/       Prisma 스키마 + 마이그레이션
  docs/
    PRD.md    제품 정의 v0.1
```

## 자동화 매트릭스

| 자원 | 발견 | 메타 | 이미지 | 색 | 트리거 |
|---|---|---|---|---|---|
| 글 | RSS feed | RSS 파서 | enclosure / og:image | (source brand fixed) | 매일 09:00 KST cron |
| 컨퍼런스 | **Haiku NER (글 본문)** | Haiku 추출 | 공식 URL og:image | **node-vibrant dominant** | 매일 00:00 KST + 운영자 승인 |
| 영상 | YouTube channelId | YouTube Data API | thumbnails.maxres | conference brand 매핑 | 매주 월 04:00 KST cron |
| RSS 소스 | **URL → `<link alternate>` 자동 탐지** | feed.title | - | - | 어드민에서 URL 입력 |

## 기술 스택

- Next 16 App Router / NestJS 11 / TypeScript 5.9
- PostgreSQL + pgvector / Redis / BullMQ
- Claude API (Haiku 4.5 요약·NER / Sonnet 4.6 챗봇)
- Voyage `voyage-3` 임베딩 (1024 차원)
- YouTube Data API v3 / node-vibrant
- pnpm workspace

## 빠른 시작

### 1) 인프라

가장 빠른 길은 docker compose. Postgres 는 pgvector extension 포함 이미지.

```bash
docker compose up -d
```

대안 (cloud):
- **Neon** (https://neon.tech) — pgvector 자동 포함, 무료 티어
- **Supabase** (https://supabase.com) — pgvector extension 활성화 필요
- **Upstash Redis** (https://upstash.com) — 무료 티어

cloud 사용 시 발급받은 connection string 을 `.env` 에 박으면 docker 불필요.

### 2) 환경 변수

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp packages/db/.env.example packages/db/.env
# Anthropic / Voyage / YouTube 키 입력
```

| 키 | 받는 곳 | 용도 |
|---|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com | 요약(Haiku) / 챗봇(Sonnet) / 컨퍼런스 NER |
| `VOYAGE_API_KEY` | https://www.voyageai.com | 글 임베딩 (voyage-3, 1024 차원) |
| `YOUTUBE_API_KEY` | https://console.cloud.google.com | 영상 sync (선택) |

### 3) DB 마이그레이션

```bash
pnpm --filter @pulse/db generate    # Prisma Client
pnpm --filter @pulse/db migrate     # 마이그레이션 (개발)
# 또는 프로토타입: pnpm --filter @pulse/db prisma db push
```

### 4) 서버 기동

```bash
pnpm --filter @pulse/api dev        # 4000 포트
pnpm --filter @pulse/web dev        # 3000 포트
```

### 5) 첫 수집 (cron 안 기다리고 수동 트리거)

```bash
curl -X POST http://localhost:4000/api/v1/ingestion/trigger
# 30개 글 RSS 수집 → 요약/임베딩 큐 push (1~2분)

curl -X POST http://localhost:4000/api/v1/conferences/discover
# 글에서 컨퍼런스 후보 추출 (PROPOSED)
```

승인:
- `/admin/conferences` 에서 후보 검토 → 승인 → 메인 노출
- `/admin/sources` 에서 블로그 URL 입력 → RSS 자동 발견 → 등록

## 테스트

```bash
pnpm --filter @pulse/api test       # NestJS Jest
pnpm --filter @pulse/web test       # Vitest
```

현재 100+ 건 단위/통합 테스트.

## 문서

- [PRD v0.1](./docs/PRD.md)
