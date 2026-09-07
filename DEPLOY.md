# 배포 가이드

현재 웹의 Cloudflare Pages 배포 절차는 [Cloudflare Pages 가이드](docs/cloudflare-pages.md)를 참고한다. 아래는 Vercel + Railway 신규 설치 절차다.

Devbrief 를 **Vercel(web) + Railway(api + Postgres + Redis)** 로 배포하는 절차입니다.
api 는 cron(`@nestjs/schedule`) 과 BullMQ 워커가 상주해야 하므로 서버리스가 아닌
Railway 의 상시 컨테이너에 올립니다. 정적/SSR 프론트는 Vercel 에 올립니다.

## 전체 그림

```text
사용자 ──> Vercel (apps/web, Next.js 16)
              │  NEXT_PUBLIC_API_BASE
              ▼
          Railway api (apps/api, NestJS) ──> Railway Postgres (pgvector)
              │                          └─> Railway Redis (BullMQ)
              └─ cron + BullMQ 워커 상주
```

배포 순서: **Railway(Postgres → Redis → api)** 를 먼저 올려 공개 URL 을 확보한 뒤,
그 URL 을 Vercel web 의 `NEXT_PUBLIC_API_BASE` 로 넣고 web 을 배포합니다.
마지막에 api 의 `FRONTEND_URL` 을 Vercel 도메인으로 갱신해 CORS 를 연결합니다.

## 1. Railway — Postgres

1. Railway 프로젝트 생성 → **New → Database → Add PostgreSQL**.
2. pgvector 활성화: Railway 기본 Postgres 이미지에는 pgvector 확장이 포함되어 있어
   `CREATE EXTENSION` 만 하면 됩니다. **두 가지 중 한 방법**으로 보장됩니다.
   - **(권장) 마이그레이션이 자동 처리** — 초기 마이그레이션
     `packages/db/prisma/migrations/0_init/migration.sql` 첫머리에
     `CREATE EXTENSION IF NOT EXISTS "vector";` 가 포함되어 있어
     `prisma migrate deploy` 시 자동 생성됩니다 (아래 3-4 단계).
   - **(수동 확인)** Railway Postgres 의 **Data/Query 탭**에서 직접 실행해도 됩니다.

     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

3. Postgres 서비스의 **Variables** 에서 `DATABASE_URL`(또는 `DATABASE_PUBLIC_URL`) 을 확인합니다.
   api 서비스에서 이 값을 참조합니다 (`${{Postgres.DATABASE_URL}}`).

## 2. Railway — Redis

1. **New → Database → Add Redis**.
2. Redis 서비스의 `REDIS_URL` 을 확인합니다. api 서비스가 `${{Redis.REDIS_URL}}` 로 참조합니다.
   - 코드는 `rediss://`(TLS) 도 자동 처리합니다 (`apps/api/src/app.module.ts` 의 BullMQ factory).

## 3. Railway — api 서비스

1. **New → GitHub Repo** 로 `wooinwoo/devbrief` 연결.
2. 빌드 설정: 루트의 `railway.json` 이 자동 인식됩니다.
   - builder: **Dockerfile** (`apps/api/Dockerfile`)
   - 빌드 컨텍스트: **레포 루트** (pnpm workspace 전체 필요)
   - healthcheck: `/health` (prefix 없는 경로)
   - **Root Directory 는 비워 두세요(레포 루트).** Dockerfile 이 워크스페이스 전체를 복사합니다.
3. **Variables** 설정 (아래 [환경 변수표](#환경-변수표) 참고). 최소:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `REDIS_URL` = `${{Redis.REDIS_URL}}`
   - `GEMINI_API_KEY`, `ADMIN_API_TOKEN`, `FRONTEND_URL` (web 배포 후 갱신)
   - `PORT` 는 Railway 가 자동 주입하므로 설정하지 않습니다.
4. **첫 배포 후 마이그레이션 적용** — DB 스키마/pgvector 확장을 생성합니다.
   Railway 의 api 서비스에서 일회성 명령으로 실행합니다.

   ```bash
   # railway CLI 사용 (railway link 후)
   railway run pnpm db:migrate:deploy
   ```

   또는 로컬에서 Railway Postgres 의 공개 `DATABASE_URL` 을 환경변수로 지정해 실행:

   ```bash
   DATABASE_URL="<railway-postgres-public-url>" pnpm db:migrate:deploy
   ```

   `pnpm db:migrate:deploy` = `prisma migrate deploy` (idempotent, 재실행 안전).
5. **Networking → Generate Domain** 으로 api 공개 URL 을 만듭니다
   (예: `https://devbrief-api.up.railway.app`). 이 URL + `/api/v1` 가 web 의 API 베이스입니다.
6. 헬스체크 확인: `https://<api-domain>/health` 가 `{"status":"ok",...}` 를 반환하면 정상.

## 4. Vercel — web

1. Vercel 에서 **New Project → `wooinwoo/devbrief` import**.
2. **Root Directory: `apps/web`** 로 지정.
3. 빌드/설치 명령은 `apps/web/vercel.json` 에 정의되어 있어 자동 인식됩니다
   (모노레포 루트에서 `pnpm install` → `pnpm --filter @devbrief/web build`).
   - Framework Preset: **Next.js** (자동 감지)
4. **Environment Variables** 설정:
   - `NEXT_PUBLIC_API_BASE` = `https://<api-domain>/api/v1` (3-5 의 URL + `/api/v1`)
   - `ADMIN_API_TOKEN` (web 서버 전용, NEXT_PUBLIC 금지) = api 의 값과 동일. 서버 프록시가 붙여 보냄
   - (선택) `ADMIN_PASSWORD` — 어드민 로그인용 (web proxy 가 검증)
5. **Deploy**. 배포 후 Vercel 도메인을 확인합니다 (예: `https://devbrief.vercel.app`).

## 5. 연결 마무리 (CORS)

1. Railway api 서비스의 `FRONTEND_URL` 을 Vercel 도메인으로 설정/갱신
   (예: `https://devbrief.vercel.app`). api 가 재배포되며 CORS origin 이 적용됩니다.
2. 확인:
   - 웹 홈에서 글/영상/레포가 보이면 web → api 연결 성공.
   - 데이터가 비어 있으면 수동 수집을 한 번 트리거합니다 (`x-admin-token` 필요):

     ```bash
     curl -X POST https://<api-domain>/api/v1/ingestion/trigger \
       -H "x-admin-token: <ADMIN_API_TOKEN>"
     ```

   - 이후 cron 이 자동으로 채웁니다 (수집 09:00 / 다이제스트 09:30 / 트렌딩 08:30 KST 등).

## 환경 변수표

| 변수 | 위치 | 받는 곳 / 값 | 필수 |
|---|---|---|---|
| `DATABASE_URL` | Railway api | `${{Postgres.DATABASE_URL}}` (Railway Postgres) | 필수 |
| `REDIS_URL` | Railway api | `${{Redis.REDIS_URL}}` (Railway Redis) | 필수 |
| `GEMINI_API_KEY` | Railway api | https://aistudio.google.com (무료 티어) | 권장 |
| `GEMINI_MODEL` | Railway api | 기본 `gemini-2.5-flash-lite`. 바꿀 때만 | 선택 |
| `YOUTUBE_API_KEY` | Railway api | Google Cloud Console. 영상 sync 용 | 선택 |
| `INGEST_MAX_PER_SOURCE` | Railway api | 소스당 최대 수집 글 수 | 선택 |
| `ADMIN_API_TOKEN` | Railway api | 직접 지정한 공유 시크릿. 쓰기 API 보호 | 필수 |
| `FRONTEND_URL` | Railway api | Vercel web 공개 도메인 (CORS origin) | 필수 |
| `PORT` | Railway api | **Railway 자동 주입 — 설정 금지** | 자동 |
| `API_PORT` | Railway api | 로컬 전용 기본 4000. 배포 시 불필요 | 선택 |
| `NEXT_PUBLIC_API_BASE` | Vercel web | `https://<api-domain>/api/v1` | 필수 |
| `ADMIN_API_TOKEN` | Vercel web | 서버 전용(NEXT_PUBLIC 금지). 프록시가 x-admin-token 주입 | 필수 |
| `ADMIN_PASSWORD` | Vercel web | 어드민 로그인 비밀번호 (web proxy 검증) | 어드민 사용 시 |
| `ADMIN_SESSION_SECRET` | Vercel web | 어드민 세션 서명키. 회전 시 전 세션 로그아웃 | 어드민 사용 시 |

> 시크릿(토큰/키)은 각 플랫폼 대시보드의 Variables 에만 넣습니다.
> 레포의 `.env*` 에 실제 값을 커밋하지 마세요 (`.env.example` 은 placeholder 만).

> GitHub Actions(`.github/workflows/ingest.yml`)는 별도로 repo secrets 를 사용합니다:
> `DATABASE_URL`, `GEMINI_API_KEY`, `YOUTUBE_API_KEY`(선택),
> `SLACK_WEBHOOK_URL`(실패 알림용, 선택 — 없으면 알림 스텝이 조용히 skip).

## 크리덴셜 회전 (유출 대응)

토큰/키가 유출됐거나 유출이 의심될 때의 회전(rotation) 절차입니다.
원칙: **유출된 값의 무효화가 최우선** — 그 과정의 짧은 어드민 기능 중단은 감수합니다.

### ADMIN_PASSWORD (웹 어드민 로그인 비밀번호)

1. Vercel(web) → Settings → Environment Variables 에서 `ADMIN_PASSWORD` 를 새 값으로
   교체하고 **재배포**합니다.
2. 검증이 매 요청 env 기준이라 재배포 즉시 이전 비밀번호는 어디서도 통하지 않습니다.
   세션 토큰이 비밀번호에서 파생되는 구성에서는 기존 세션도 전부 무효화됩니다.
   세션 서명키(`ADMIN_SESSION_SECRET`)를 분리한 구성이면 아래 세션 서명키 회전을 함께 하세요.
3. 확인: `/admin` 에서 새 비밀번호로 로그인되고, 기존 브라우저 세션은 로그아웃되는지 확인합니다.

### ADMIN_SESSION_SECRET (웹 어드민 세션 서명키)

1. 새 랜덤 값을 만듭니다.

   ```bash
   openssl rand -hex 32
   ```

2. Vercel(web) 의 `ADMIN_SESSION_SECRET` 를 교체하고 재배포합니다.
3. **회전하면 전 세션이 즉시 로그아웃**됩니다 (기존 세션 토큰의 서명이 무효화됨).
   세션 쿠키 유출이 의심되면 비밀번호 교체 없이 이 키만 돌려도 충분합니다.

### ADMIN_API_TOKEN (api 쓰기 보호 공유 시크릿)

Railway(api)와 Vercel(web)이 **같은 값**을 써야 합니다. 두 값이 다른 동안 어드민 쓰기
기능은 401 로 멈춥니다 (읽기/서빙은 영향 없음).

1. **Railway(api)를 먼저** 새 값으로 교체합니다 — 유출된 토큰의 즉시 무력화가
   잠깐의 어드민 쓰기 중단보다 우선입니다.
2. 곧바로 Vercel(web) 의 `ADMIN_API_TOKEN` 을 같은 값으로 교체하고 재배포합니다.
3. 확인 (새 토큰으로 200 이면 완료):

   ```bash
   curl -X POST https://<api-domain>/api/v1/ingestion/trigger \
     -H "x-admin-token: <새 ADMIN_API_TOKEN>"
   ```

### GEMINI_API_KEY

이 키는 **두 곳 이상**에 있습니다: Railway(api) Variables 와
GitHub repo → Settings → Secrets and variables → Actions (`ingest.yml` 이 사용).
로컬 `.env` 에 복사해뒀다면 그것도 교체 대상입니다.

1. https://aistudio.google.com 에서 새 키 발급 → **기존 키 삭제(revoke)**.
2. Railway(api)와 GitHub Actions secrets 의 `GEMINI_API_KEY` 를 모두 새 값으로 교체합니다.
3. 확인: Actions 의 `Ingest` 워크플로를 `reanalyze` 로 수동 실행 —
   Preflight 스텝 통과 후 로그에 `embedded>0` 이면 정상입니다.
   키가 비어 있으면 Preflight/CLI env 검증이 빨간불로 즉시 알려줍니다.

## pgvector 메모

- 임베딩 컬럼은 `Article.embedding vector(768)` (Gemini `text-embedding-004` 768차원).
- 확장 생성은 초기 마이그레이션이 `CREATE EXTENSION IF NOT EXISTS "vector"` 로 처리합니다.
- Railway 기본 Postgres 이미지는 pgvector 를 포함하므로 별도 이미지 교체 불필요합니다.
- 만약 `type "vector" does not exist` 에러가 나면, Postgres Query 탭에서
  `CREATE EXTENSION IF NOT EXISTS vector;` 를 먼저 실행한 뒤 `migrate deploy` 를 재실행하세요.

## 로컬에서 Dockerfile 검증 (선택)

```bash
# 빌드 컨텍스트는 반드시 레포 루트
docker build -f apps/api/Dockerfile -t devbrief-api .
docker run --rm -p 4000:4000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e GEMINI_API_KEY="..." \
  devbrief-api
# 헬스체크: curl http://localhost:4000/health
```
