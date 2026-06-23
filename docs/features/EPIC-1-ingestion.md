# EPIC-1 · 콘텐츠 수집 파이프라인

RSS/Atom 피드를 긁어 글로 저장하고, 요약·임베딩 큐에 흘려보내는 입구. + 소스(피드) 자동 발견·관리.

**컴포넌트**: `apps/api/src/ingestion/*`, `apps/api/src/sources/*`

---

## 수집 (Ingestion)

### PULSE-101 · RSS 피드 파싱
**타입** Task · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: URL의 RSS/Atom 피드를 파싱해 아이템 메타데이터 추출
- **어떻게**: `rss-parser` 라이브러리, 타임아웃 10초, User-Agent 위장(NAVER D2 등 406 차단 우회), `customFields`로 `content:encoded`·`media:content`·`media:thumbnail` 매핑 — `ingestion/rss-parser.service.ts:16-32`
- **비고**: `content:encoded` 처리로 전문 HTML 지원

### PULSE-102 · RSS 이미지 추출 + 절대경로 변환
**타입** Task · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 아이템 내 이미지 URL을 우선순위로 추출, 상대→절대경로 변환
- **어떻게**: 우선순위 (1)enclosure (2)media:thumbnail (3)media:content (4)`<img src>` 정규식, `OgImageService.absolutize()` 활용 — `rss-parser.service.ts:46-79`
- **비고**: RSS에 이미지 없으면 원문 og:image fallback

### PULSE-103 · 소스당 최신 아이템 상한
**타입** Story · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 피드당 수집 수 제한 — 전체 아카이브 피드(OpenAI 등) 폭주 방지
- **어떻게**: `maxPerSource`(env, 기본 30), publishedAt 내림차순 정렬 후 slice — `ingestion.service.ts:35-47`
- **비고**: Gemini 일일 한도 안에서 번역/요약이 돌게 하는 1차 밸브

### PULSE-104 · URL 기준 중복 스킵
**타입** Task · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 이미 저장된 URL이면 스킵
- **어떻게**: `article.findUnique({ where: { url } })` — `ingestion.service.ts:54-55`
- **비고**: url 유니크 제약 기반

### PULSE-105 · 본문 발췌 정제·저장 (contentSnippet)
**타입** Story · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: content:encoded/contentSnippet/description을 평문화(HTML·엔티티 제거)해 800자 저장
- **어떻게**: 정규식 `<[^>]+>`·`&[a-z]+;` 제거 + 공백 정규화 — `ingestion.service.ts:59-69`
- **비고**: 요약 재생성용. 백필 시 원문 재취득 불필요 (→ PULSE-205와 연동)

### PULSE-106 · 아티클 메타데이터 저장
**타입** Task · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 제목/URL/저자/발행일/태그/이미지/본문발췌를 Article로 생성
- **어떻게**: `article.create()`, 제목 500자·태그 10개 제한 — `ingestion.service.ts:71-82`
- **비고**: publishedAt 없으면 현재시각 기본값

### PULSE-107 · 요약 큐 적재 + 지수 백오프 재시도
**타입** Story · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 새 글을 summarization 큐에 추가, 최대 6회 재시도
- **어떻게**: BullMQ `queue.add`, attempts:6, exponential backoff 60초, removeOnComplete:500/Fail:1000, 본문 4000자 — `ingestion.service.ts:85-99`
- **비고**: 한도/일시 장애 시 자동 재시도

### PULSE-108 · 임베딩 큐 적재
**타입** Task · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 새 글을 embedding 큐에 추가(제목+본문 2000자)
- **어떻게**: `queue.add('embed', …)` — `ingestion.service.ts:100-104`
- **비고**: 요약 큐와 달리 재시도 정책 기본값

### PULSE-109 · 전체 활성 소스 수집 오케스트레이션
**타입** Story · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 활성 소스 전부 순회, 실패 격리 후 계속 진행
- **어떻게**: `findMany({where:{active:true}})` 순회 + try-catch — `ingestion.service.ts:18-31`

### PULSE-110 · 일일 수집 스케줄 (cron)
**타입** Story · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 매일 09:00 KST 전체 수집 자동 실행
- **어떻게**: `@Cron('0 9 * * *', {timeZone:'Asia/Seoul'})`, 큐 'ingest-all' 적재 — `ingestion.cron.ts:13-16`

### PULSE-111 · 온디맨드 수집 API (비동기/동기)
**타입** Task · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 수동 트리거 — 큐 적재(즉시 반환) / 직접 실행(블로킹)
- **어떻게**: `POST /ingestion/run` (queued), `POST /ingestion/run-sync` (ingestAll 직접) — `ingestion.controller.ts:17-26`
- **비고**: run-sync는 타임아웃 위험

### PULSE-112 · 요약/임베딩 일괄 재처리 (reanalyze)
**타입** Story · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 기존 글을 요약/임베딩 큐에 재적재 (모델 교체·백필용)
- **어떻게**: `POST /ingestion/reanalyze` — 기본은 `summaryOneLine OR summaryThreeLine == null`인 글, `onlyMissing=0`이면 전체, limit 최대 2000 — `ingestion.controller.ts:33-72`
- **비고**: 저장된 contentSnippet로 재생성, 동일 재시도 정책

### PULSE-113 · 수집 큐 워커
**타입** Task · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 'ingest-all'/'ingest-source' 작업 처리
- **어떻게**: `@Processor('ingestion')`, job.name 분기 — `ingestion.processor.ts:14-24`

### PULSE-114 · 기본 RSS 소스 시드 (13개)
**타입** Task · **상태** ✅ · **컴포넌트** ingestion
- **무엇**: 부팅 시 기본 소스 13개 upsert (한국 5 + 해외 2 + AI 6)
- **어떻게**: `OnApplicationBootstrap`, feedUrl 기준 upsert — `source-seeder.service.ts:116-138`
- **비고**: Anthropic은 공식 RSS 폐지로 자동 비활성

---

## 소스 발견·관리 (Sources)

### PULSE-115 · RSS 자동 발견 (URL→피드 후보)
**타입** Story · **상태** ✅ · **컴포넌트** sources
- **무엇**: 입력 URL에서 피드 자동 발견 (직접 피드 → HTML link alternate → 경로 추측)
- **어떻게**: 3단계 `tryParseFeed` → `extractAlternateLinks` → `guessFeedPaths(/rss,/feed,/rss.xml,/atom.xml)` — `rss-discovery.service.ts:31-51,112-155`
- **비고**: 최대 5개 후보, DB 저장 안 함(미리보기)

### PULSE-116 · 피드 발견 + 자동 등록
**타입** Story · **상태** ✅ · **컴포넌트** sources
- **무엇**: discover 후 Source upsert, 중복 feedUrl 스킵
- **어떻게**: findUnique 체크 후 create, 한글 정규식으로 language 자동 감지 — `rss-discovery.service.ts:54-83`
- **비고**: provider='rss_generic' 고정

### PULSE-117 · HTML link[rel=alternate] 파싱
**타입** Task · **상태** ✅ · **컴포넌트** sources
- **무엇**: `<link rel="alternate" type="application/rss+xml">` 추출
- **어떻게**: 정규식으로 link 태그 추출 후 속성별 파싱 — `rss-discovery.service.ts:112-140`

### PULSE-118 · 일반 경로 피드 추측 + 검증
**타입** Task · **상태** ✅ · **컴포넌트** sources
- **무엇**: 흔한 경로 생성 후 실제 파싱 가능 여부 검증
- **어떻게**: origin + 경로 매핑 → 각 후보 `tryParseFeed` 검증 — `rss-discovery.service.ts:142-169`

### PULSE-119 · HTML 페이지 안전 fetch
**타입** Task · **상태** ✅ · **컴포넌트** sources
- **무엇**: 발견용 HTML 다운로드 (타임아웃·크기 제한)
- **어떻게**: axios GET, timeout 5초, maxContentLength 2MB, UA 'PulseBot/1.0' — `rss-discovery.service.ts:95-110`
- **비고**: 실패 시 null

### PULSE-120 · 소스 CRUD API
**타입** Story · **상태** ✅ · **컴포넌트** sources
- **무엇**: 소스 목록/토글/삭제
- **어떻게**: `GET /sources`(생성순), `PATCH /sources/:id/toggle`(active 반전), `DELETE /sources/:id` — `sources.controller.ts:21-56`
- **비고**: 삭제 시 연관 아티클은 유지(FK cascade 없음)

### PULSE-121 · 피드 발견 API (미리보기/등록)
**타입** Task · **상태** ✅ · **컴포넌트** sources
- **무엇**: `POST /sources/discover`(후보만), `POST /sources/discover-and-register`(일괄 등록)
- **어떻게**: discover() / discoverAndRegister() 위임 — `sources.controller.ts:28-40`
- **비고**: 등록 응답 `{created, existing, feeds[]}`
