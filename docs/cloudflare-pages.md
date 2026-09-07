# Cloudflare Pages 배포

`apps/web`의 Next.js 화면을 vinext와 Pages Advanced Mode로 실행한다. API, DB, Redis와 수집 작업은 기존 서버를 사용한다.

## 현재 구성

- 웹: https://devbrief.pages.dev
- API: https://devbrief-api-8lyo.onrender.com/api/v1
- 정적 파일: Pages CDN (`/_next/static/*`는 함수 실행에서 제외)
- 서버 렌더링/관리자 접근 검사: Pages `_worker.js`
- 브라우저 API 요청: 같은 출처의 `/api/public/*` → 기존 API (GET 전용, 경로 제한)
- 기존 Next.js/Vercel 빌드: `pnpm --filter @devbrief/web build`

vinext는 beta 버전을 고정해 사용한다. 라이브러리 업데이트 때는 서버 렌더링과 클라이언트 화면 전환을 모두 확인한다.

## 로컬 검증과 배포

레포 루트에서 Node 22.12 이상과 Corepack을 사용한다.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @devbrief/web test
corepack pnpm --filter @devbrief/web typecheck
corepack pnpm --filter @devbrief/web build:pages
corepack pnpm --filter @devbrief/web preview:pages
```

로컬 주소는 http://127.0.0.1:3001 이다. 다시 빌드할 때는 preview 프로세스를 먼저 종료한다.

```sh
corepack pnpm --filter @devbrief/web exec wrangler login
# 최초 한 번만: 이미 존재하면 생략
corepack pnpm --filter @devbrief/web exec wrangler pages project create devbrief --production-branch master
corepack pnpm --filter @devbrief/web deploy:pages
```

`build:pages`는 클라이언트 파일과 서버 코드를 별도로 만들고, 서버 코드만 `_worker.js`에 묶는다. 생성 파일 `dist/pages`만 업로드한다. 압축된 서버 코드가 무료 플랜의 3 MiB를 넘으면 빌드를 실패시킨다. 이 절차는 유료 플랜을 활성화하지 않는다.

## 환경변수

`NEXT_PUBLIC_API_BASE`는 공개 주소이며 빌드 시 주입된다. 다른 API를 연결하려면 빌드 환경과 `apps/web/wrangler.jsonc`의 주소를 함께 바꾸고 다시 빌드한다. `build:pages`는 브라우저에 `NEXT_PUBLIC_API_PROXY_PATH=/api/public`을 설정하므로 기존 API의 CORS 허용 목록을 변경할 필요가 없다.

2026-09-07 확인 당시 Vercel 프로젝트에는 `NEXT_PUBLIC_API_BASE`만 있었고 공유 환경변수는 없었다. 관리자 로그인은 기존과 같이 비밀번호 미설정 시 거부된다. 관리자를 활성화하려면 다음 값을 Pages의 암호화된 secret으로 별도 등록한다. 값을 Git에 넣거나 `NEXT_PUBLIC_` 접두사로 등록하면 안 된다.

- `ADMIN_PASSWORD`: 관리자 로그인 비밀번호
- `ADMIN_SESSION_SECRET`: 세션 서명용 비밀값
- `ADMIN_API_TOKEN`: 기존 API 서버의 관리자 토큰과 일치하는 값

기존 Render 서버의 응답 시간과 콜드 스타트는 이 웹 배포로 바뀌지 않는다. 무료 Pages Functions의 요청/CPU 한도는 Cloudflare 계정에서 확인한다.

## 확인된 기존 API 문제

배포 준비 당시 목록과 batch API는 정상이나 기사 단건 API는 500을 반환했고, 기존 Vercel에서도 기사 상세가 404로 표시됐다. 웹은 단건 API의 5xx/연결 실패 시 batch에서 **같은 ID의 실제 기사 요약과 원문 링크**를 가져온다. 원문 본문을 새로 만들지 않으며 정상적인 404는 그대로 유지한다. 2026-09-07 운영 DB의 누락 마이그레이션을 적용해 이 오류를 해결했다. 복구 결과와 수집 범위는 [데이터 복구 기록](deployment-audit-2026-09-07.md)을 참고한다.

## 재배포와 복구

이 문서의 CLI 배포는 수동이다. Git 푸시 자동 배포는 별도 CI 자격 증명 설정이 필요하다. 배포 기록은 Cloudflare의 Workers & Pages → devbrief → Deployments에서 확인하고, 문제가 있으면 이전 성공 배포로 Rollback한다. 기존 Vercel 프로젝트와 Render 데이터는 이 배포 명령으로 수정하거나 삭제하지 않는다.
