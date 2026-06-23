# EPIC-6 · Admin · DB 스키마 · 인프라

운영자(1인) 도구, 데이터 모델, 부트스트랩·배포 기반.

**컴포넌트**: `apps/web/src/app/admin/*`, `middleware.ts`, `lib/admin-auth.ts`, `packages/db/prisma/schema.prisma`, `apps/api/src/main.ts`, `docker-compose.yml`

---

## Admin

### PULSE-601 · Admin 인증 (미들웨어 쿠키)
**타입** Story · **상태** ✅
- **무엇**: 단순 비밀번호로 /admin/* 보호 (1인 운영)
- **어떻게**: `middleware.ts:5-23` 쿠키 `pulse_admin` 검증→리다이렉트, `admin-auth.ts:12-25` SHA-256(password)===토큰, `login/actions.ts:16-23` httpOnly·sameSite lax·30일
- **비고**: ⚠️ 타이밍 안전 미구현, `ADMIN_PASSWORD` 없으면 기본값 'pulse' (운영 시 교체 필수)

### PULSE-602 · 로그인 페이지
**타입** Task · **상태** ✅
- **어떻게**: form action={login}, ?from 리다이렉트 보존, 에러 시 ?error=1 border 변색 — `login/page.tsx:54-101`, `login/actions.ts:7-26`

### PULSE-603 · Admin 사이드바
**타입** Task · **상태** ✅
- **어떻게**: NAV_MAIN/CONTENT/TOOL, 활성 경로 dot, 하단 메인사이트 링크 + 로그아웃 — `sidebar.tsx:13-23`

### PULSE-604 · Admin 대시보드 (통계·진행률)
**타입** Story · **상태** ✅
- **어떻게**: Promise.all 7개 API 병렬 fetch, summarized/total 진행률 바, StatCard 6개 — `admin/(dashboard)/page.tsx:20-33`
- **비고**: no-store, 실패 시 빈 배열 graceful

### PULSE-605 · Admin RSS 소스 관리
**타입** Story · **상태** ✅
- **어떻게**: URL→discover→DiscoveredFeed[], discover-and-register 일괄 등록, 활성 배지·토글·삭제 — `sources-panel.tsx:39-90`

### PULSE-606 · Admin 컨퍼런스 후보 검토
**타입** Story · **상태** ✅
- **어떻게**: PROPOSED/ACTIVE 두 리스트, approve/reject 액션, `proposed://`는 "URL 미상" 표시, 발견 출처 표기 — `conferences/page.tsx:43-73`, `proposed-list.tsx:27-35`

### PULSE-607 · Admin 영상 관리
**타입** Story · **상태** ✅
- **어떻게**: URL→/videos/add, 목록(썸네일·duration·조회수), 분석 상태("분석됨·{chapterSource}") — `videos-panel.tsx:36-68`
- **비고**: 백그라운드 분석 → 새로고침 필요

### PULSE-608 · Admin RAG 챗 (내부용)
**타입** Task · **상태** ✅
- **어떻게**: InlineChat 재사용, ?q로 초기 질문 프리셋 — `admin-chat-client.tsx:10-11`
- **비고**: 공개는 digest/trend만, 챗은 어드민 전용(단가 고려)

---

## DB 스키마 (Prisma + pgvector)

### PULSE-609 · Article 모델
**타입** Task · **상태** ✅
- **필드**: title, titleKo?, url(@unique), summaryOneLine?, summaryThreeLine?, contentSnippet(Text), tags[], language, imageUrl?, embedding(vector 768), publishedAt, fetchedAt
- **인덱스**: publishedAt, (sourceId, publishedAt)

### PULSE-610 · Source 모델
- **필드**: provider, name, feedUrl(@unique), homepage, language(기본 en), active(기본 true)
- **시드**: 13개 (한국 5·영어 2·AI 6)

### PULSE-611 · Repo 모델
- **필드**: fullName, owner, name, url, description?, language?, languageColor?, stars, forks, **periodStars**, period(daily/weekly), category(기본 etc), rank, fetchedAt
- **인덱스**: (fullName, period)@unique, (period, rank), fetchedAt
- **특징**: 매 수집 전체 교체, ~50행 유지

### PULSE-612 · Video 모델
- **필드**: videoId(@unique), title, url, channel, thumbnailUrl, durationSec, views, topics[], description, chapters(Json), chapterSource(official/description/ai/null), summary?, analyzedAt?, conferenceId?
- **인덱스**: publishedAt, conferenceId

### PULSE-613 · Conference 모델
- **필드**: name, url(@unique), startDate, endDate?, location?, topics[], imageUrl?, brandColor?(oklch), youtubeChannelId?, status(ACTIVE/PROPOSED/REJECTED), discoveredFromArticleId?, discoveredAt?
- **인덱스**: startDate, status
- **시드**: 5개 (FECONF·if(kakao)·SLASH·DEVIEW·PyCon)

### PULSE-614 · DailyDigest 모델
- **필드**: date(@unique, 자정), items(Json [{articleId, headline, takeaway}]), intro?, generatedAt
- **인덱스**: date

### PULSE-615 · User / ReadingEvent / ChatSession·ChatMessage 모델
- **User**: email(@unique), name?, imageUrl?
- **ReadingEvent**: userId, articleId, event(viewed/opened/saved/dismissed) — 인덱스 (userId,createdAt)·(userId,articleId)
- **ChatSession/Message**: role, content(Text), citations(Json), cascade 삭제 — 인덱스 (sessionId,createdAt)
- **비고**: ⚠️ User/ReadingEvent/ChatSession은 스키마에 존재하나 현재 클라이언트는 localStorage 사용 — 서버 동기화 미연결(향후 확장 여지)

---

## 인프라 · 부트스트랩

### PULSE-616 · Docker Compose (Postgres pgvector + Redis)
**타입** Task · **상태** ✅
- **어떻게**: `pgvector/pgvector:pg16`(5432, pulse/pulse/pulse, 볼륨·healthcheck), `redis:7-alpine`(6379, 볼륨·healthcheck) — `docker-compose.yml`
- **비고**: pgvector=임베딩, Redis=BullMQ 큐. restart: unless-stopped

### PULSE-617 · NestJS 부트스트랩
**타입** Task · **상태** ✅
- **어떻게**: dotenv 선로드, ValidationPipe(whitelist+transform), CORS(FRONTEND_URL||3000, credentials), 글로벌 prefix `/api/v1`, 포트 4000 — `main.ts:1-22`
- **모듈**: Prisma·Gemini·Ingestion·Summarization·Articles·Conferences·Videos·Repos·Sources·Embedding·Chat·Digest + Schedule·Bull

### PULSE-618 · Prisma 서비스 라이프사이클
**타입** Task · **상태** ✅
- **어떻게**: OnModuleInit `$connect`, OnModuleDestroy `$disconnect` — `prisma/prisma.service.ts`

### PULSE-619 · 부트스트랩 시더 (소스 13·컨퍼런스 5)
**타입** Task · **상태** ✅
- **어떻게**: onApplicationBootstrap upsert(소스 feedUrl·컨퍼런스 url 기준), 컨퍼런스는 imageUrl 제외 보존 + fire-and-forget 이미지 sync
- **비고**: Anthropic RSS 404 자동 비활성

---

## 알려진 운영 취약점 (개선 백로그)

| 항목 | 현재 | 개선안 |
|---|---|---|
| API/웹 프로세스 | nohup (재부팅 시 사망) | `ops/systemd/` 유저 서비스 설치 (작성됨, 미설치) |
| Postgres/Redis | Docker Desktop 수동 | Windows 자동시작 설정 |
| 웹 포트 | 3001 임시 (3000은 타 프로젝트 점유) | 포트 고정 결정 필요 |
| Admin 비밀번호 | 기본값 'pulse' 가능 | ADMIN_PASSWORD 필수화 |
| 레포 카테고리 | 규칙 협소 → etc 다수 | 룰 확장 / LLM 분류 |
| 벤치마크 데이터 | 정적 하드코딩 | 분기 수동 갱신 또는 `/api/benchmarks` 자동화 |
