# 배포

운영에는 상시 실행 서버가 없다. 웹과 공개 API는 Cloudflare에서, 수집은 GitHub Actions에서 실행하고 데이터는 Neon에 둔다.

## 구성

| 구성 | 실행 위치 | 배포·실행 |
| --- | --- | --- |
| 웹 `apps/web` | Cloudflare Pages `devbrief` · https://devbrief.wooki.cc | `deploy.yml` |
| 공개 읽기 API `apps/edge-api` | Cloudflare Worker `devbrief-api` · `https://devbrief-api.wooin1001.workers.dev/api/v1` | `deploy.yml` |
| 수집 CLI `apps/api` | GitHub Actions `ingest.yml` · 매일 09:00 KST | 스케줄·수동 실행 |
| 영상 RSS 동기화 | Worker 예약 작업 · 매일 09:40 KST | `apps/edge-api/wrangler.toml` |
| 가동 확인 | GitHub Actions `keepalive.yml` · 하루 두 번 | 스케줄 |
| DB | Neon PostgreSQL + pgvector | 마이그레이션은 `ingest.yml`의 `prepare_schema` |

edge-api는 `apps/api`의 공개 GET 컨트롤러를 Worker에서 그대로 실행한다. 가드가 붙은 관리자 API는 Worker에 올리지 않으므로 운영에서는 관리자 쓰기를 사용하지 않는다. NestJS 서버(`apps/api`의 `main`)는 로컬 개발용이다.

## 자동 배포

`main`에 push하면 CI가 타입 검사·린트·테스트·빌드를 실행한다. CI가 통과하면 `deploy.yml`이 Worker와 Pages를 차례로 배포하고 API와 사이트에 스모크 테스트를 보낸다.

Pages 프로젝트의 운영 배포 이름은 예전 그대로 `master`다. wrangler 명령의 `--branch master`는 git 브랜치가 아니라 이 이름을 가리키므로 바꾸지 않는다.

## 비밀값

| 위치 | 이름 | 용도 |
| --- | --- | --- |
| GitHub `production` environment | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | 배포. 토큰은 Pages·Workers 편집 권한만 준다 |
| GitHub secrets | `DATABASE_URL` | 수집 CLI의 Neon 연결 |
| GitHub secrets (선택) | `GEMINI_API_KEY`, `YOUTUBE_API_KEY` | 비우면 AI 요약과 YouTube API를 쓰지 않는다 |
| GitHub secrets (선택) | `SLACK_WEBHOOK_URL` | 수집 실패 알림 |
| Worker secret | `DATABASE_URL` | `wrangler secret put DATABASE_URL --config apps/edge-api/wrangler.toml` |

웹 빌드의 `NEXT_PUBLIC_API_BASE`는 공개 주소라 `deploy.yml`과 `apps/web/wrangler.jsonc`에 둔다.

## 수동 배포와 복구

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @devbrief/edge-api run build
npx wrangler deploy --config apps/edge-api/wrangler.toml
corepack pnpm --filter @devbrief/web run build:pages
npx wrangler pages deploy apps/web/dist/pages --project-name devbrief --branch master --no-bundle
```

문제가 생기면 Cloudflare 대시보드의 Workers & Pages에서 이전 배포로 되돌린다. Pages 빌드 세부 사항은 [Cloudflare Pages](docs/cloudflare-pages.md)를 본다.
