# Devbrief(Pulse) 전체 기능 백로그 + 페이지 감사 (단일 문서)

> README + EPIC-1~6 + PAGE-AUDIT를 한 문서로 합친 것입니다. 태스크 표만 보려면 TASKS.md, 개별 파일도 같은 폴더에 있습니다.

## 목차
- [개요·아키텍처](#개요)
- [EPIC-1 · 콘텐츠 수집 파이프라인](#epic-1--콘텐츠-수집-파이프라인)
- [EPIC-2 · AI 처리](#epic-2--ai-처리-요약번역임베딩rag-챗)
- [EPIC-3 · 레포·글·다이제스트](#epic-3--콘텐츠-도메인-a-github-레포--글-api--데일리-다이제스트)
- [EPIC-4 · 영상·컨퍼런스](#epic-4--콘텐츠-도메인-b-영상--컨퍼런스--공통-유틸)
- [EPIC-5 · 웹 공개 화면](#epic-5--웹-공개-화면-탭--페이지--컴포넌트)
- [EPIC-6 · Admin·DB·인프라](#epic-6--admin--db-스키마--인프라)
- [🔍 페이지별 사용성 감사](#페이지별-사용성개선점실용성-감사)

---

<a id="개요"></a>

이 서비스에 **실제로 구현된 기능**을 JIRA 백로그처럼 잘게 쪼개 정리한 문서입니다.
코드를 직접 읽고 작성했으며, 각 태스크에 구현 파일·라인을 인용했습니다. (작성 시점 기준)

> 표기: **타입** Story(사용자 가치 단위) / Task(기술 단위) · **상태** ✅ 구현됨 · 파일경로는 저장소 루트 기준

> 📊 **태스크 113개를 한 파일에 표로 → [TASKS.md](./TASKS.md)** (에픽별 표, ID·제목·타입·구현·파일)
> 📄 **전체를 한 문서에서 보려면 → [BACKLOG.md](./BACKLOG.md)** (README + 에픽 6개 + 페이지 감사 통합)
> 🔍 **페이지별 사용성·개선점·실용성 감사 → [PAGE-AUDIT.md](./PAGE-AUDIT.md)** (전 페이지 전수조사, 22개 개선 백로그)

## 에픽 목록

| 에픽 | 영역 | 태스크 | 문서 |
|---|---|---|---|
| **EPIC-1** | 콘텐츠 수집 파이프라인 (RSS 수집·소스 발견) | 21 | [EPIC-1-ingestion.md](./EPIC-1-ingestion.md) |
| **EPIC-2** | AI 처리 (요약·번역·임베딩·RAG 챗) | 10 | [EPIC-2-ai-processing.md](./EPIC-2-ai-processing.md) |
| **EPIC-3** | 콘텐츠 도메인 A (GitHub 레포·글 API·데일리 다이제스트) | 19 | [EPIC-3-repos-articles-digest.md](./EPIC-3-repos-articles-digest.md) |
| **EPIC-4** | 콘텐츠 도메인 B (영상·컨퍼런스·공통 유틸) | 16 | [EPIC-4-videos-conferences.md](./EPIC-4-videos-conferences.md) |
| **EPIC-5** | 웹 공개 화면 (탭·페이지·컴포넌트) | 28 | [EPIC-5-web-ui.md](./EPIC-5-web-ui.md) |
| **EPIC-6** | Admin · DB 스키마 · 인프라 | 19 | [EPIC-6-admin-db-infra.md](./EPIC-6-admin-db-infra.md) |

**합계 113개 태스크.**

## 한눈에 보는 아키텍처

```
[RSS 13소스] ─┐
[GitHub Trending] ─┤      ┌─ summarization 큐 (Gemini→무료번역→추출) ─┐
[YouTube 채널]  ─┼─ NestJS ┼─ embedding 큐 (pgvector 768d) ──────────┼─ Postgres(pgvector)
[원문 fetch]    ─┘  (BullMQ)└─ video-analyze 큐 (3-tier 챕터) ─────────┘   + Redis(큐)
                      │
                  cron 5종 (수집09:00 / 다이제스트09:30 / 레포08:30 / 영상월04:00 / 컨퍼런스00:00)
                      │
                  REST /api/v1 ── Next.js 웹 (6탭 + RAG 챗 + Admin)
```

## 횡단 설계 원칙 (에픽 공통)

- **무료 우선 / AI 의존 최소화** — Gemini는 1순위 품질 경로일 뿐, 죽어도 서비스가 돌도록 모든 AI 단계에 무료 폴백을 둔다. (요약·번역·다이제스트)
- **개인 프로젝트 스케일** — 데이터 누적을 피한다. GitHub 레포는 매번 전체 교체(deleteMany→createMany)로 ~50행만 유지.
- **graceful degradation** — 외부 fetch(원문·og:image·번역)는 실패해도 throw하지 않고 null/skip 후 로깅.
- **운영 취약점(알려진 것)** — API/웹은 nohup, Postgres/Redis는 Docker Desktop 수동. 재부팅 시 수동 복구 필요(`ops/systemd/` 미설치).


---

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


---

# EPIC-2 · AI 처리 (요약·번역·임베딩·RAG 챗)

수집된 글을 한국어화·요약·벡터화하고, 그 벡터로 RAG 챗을 돌리는 두뇌. **핵심 설계는 3-tier 폴백** — Gemini가 죽어도 무료 경로로 한국어 요약이 계속 나온다.

**컴포넌트**: `summarization/*`, `translation/*`, `embedding/*`, `ai/*`, `chat/*`

```
요약:  Gemini(고품질) ──실패──▶ 무료번역(Google→MyMemory)+본문추출 ──본문없음──▶ 비움
임베딩: Gemini text-embedding-004 ──실패──▶ skip(폴백 없음, reanalyze 수동)
챗:    pgvector kNN 검색 ─▶ Gemini 스트리밍 생성
```

---

### PULSE-201 · Gemini 고품질 요약 (JSON)
**타입** Story · **상태** ✅ · **컴포넌트** summarization
- **무엇**: 제목+본문 → `{language, titleKo, summaryOneLine(40자), summaryThreeLine(3줄)}` JSON 생성
- **어떻게**: `@google/genai`, 모델 `gemini-2.5-flash-lite`(env override), 한국어 에디터 시스템프롬프트, `generateJson()` responseMimeType=application/json + 파싱 fallback — `summarization.service.ts:7-83`, `ai/gemini.service.ts:56-75`
- **트리거**: BullMQ `summarization` 큐 (concurrency 2, 분당 10개 rate limit — Gemini 무료 5/분 회피) — `summarization.processor.ts:13-27`
- **비고**: `isAvailable()`은 키 존재만 검사 → 실제 호출 실패 시 catch 후 무료 폴백 — `summarization.service.ts:73-78`

### PULSE-202 · 무료 경로 한국어화 + 추출식 요약
**타입** Story · **상태** ✅ · **컴포넌트** summarization
- **무엇**: LLM 없이 무료 번역 + 본문 문장 추출로 한/세 줄 요약 생성 (Gemini 만료 시)
- **어떻게**: 제목은 `TranslationService.toKorean()`, 본문 1~3문장 추출(`(?<=[.!?。])\s+` 분할) 후 영문이면 통째 번역→재분할, oneLine≤140자·threeLine 각≤90자 clamp — `summarization.service.ts:85-182`
- **트리거**: Gemini 실패 시 summarize()가 자동 호출
- **비고**: 본문 확보 우선순위 ① 전달 snippet ② DB contentSnippet ③ 원문 fetch(PULSE-203). 진짜 압축이 아닌 추출이지만 빈 요약보다 우월

### PULSE-203 · 원문 본문 fetch (cheerio 휴리스틱)
**타입** Story · **상태** ✅ · **컴포넌트** summarization
- **무엇**: RSS에 본문 없는 글의 원문 URL에서 평문 본문 추출 (유료 readability API 없이)
- **어떻게**: axios(12초·5MB) + cheerio. 보일러플레이트(script/nav/aside/footer…) 제거 → `<article>`→`<main>`→`<p>`밀도 최대 컨테이너 선택 → p/li 30자+ 필터 → 최대 1200자 — `summarization/article-fetch.service.ts:17-82`
- **트리거**: summarizeFree에서 본문 60자 미만일 때
- **비고**: fetch 성공 시 contentSnippet 800자 캐시(다음 재처리 fetch 스킵). 실패는 전부 silent null

### PULSE-204 · 무료 번역 (Google 비공식 → MyMemory)
**타입** Story · **상태** ✅ · **컴포넌트** translation
- **무엇**: 키 불필요 무료 영→한 번역, 2단 폴백
- **어떻게**: ① `translate.googleapis.com/translate_a/single`(client=gtx) ② `api.mymemory.translated.net` 폴백, 각 타임아웃 10초 — `translation.service.ts:61-99`
- **비고**: 비공식 엔드포인트 → IP 차단 위험. rate limit은 summarization 큐(분당 10)에서 적용

### PULSE-205 · 매체명 보호 placeholder 마스킹
**타입** Task · **상태** ✅ · **컴포넌트** translation
- **무엇**: 번역하면 안 되는 고유명사(Import AI, Hacker News 등)를 보존
- **어떻게**: 번역 전 14개 매체명을 `⟦0⟧`로 마스킹 → 번역 → 복원, 깨진 placeholder 제거 정규식 — `translation.service.ts:16-27,39-58`
- **비고**: 리스트 하드코딩 (CMS/DB 동적화는 TODO)

### PULSE-206 · 한글 감지
**타입** Task · **상태** ✅ · **컴포넌트** translation
- **무엇**: 한글 음절 있으면 이미 한국어로 간주 → 번역 스킵
- **어떻게**: `/[가-힣]/` 테스트 — `translation.service.ts:30-32`
- **비고**: 영+한 혼합도 한국어 취급 (단순화)

### PULSE-207 · 임베딩 생성 (pgvector 768d)
**타입** Story · **상태** ✅ · **컴포넌트** embedding
- **무엇**: 제목+본문(8000자)을 768차원 벡터로 변환해 pgvector 저장
- **어떻게**: Gemini `text-embedding-004`, taskType RETRIEVAL_DOCUMENT, raw SQL `UPDATE … SET embedding=$1::vector` — `embedding.service.ts:40-54`, `ai/gemini.service.ts:98-108`
- **트리거**: BullMQ `embedding` 큐
- **비고**: 무료 대안 없음 → 키 없거나 한도 시 silent skip (재시도 폭증 방지), reanalyze로 복구

### PULSE-208 · Gemini 통합 클라이언트
**타입** Task · **상태** ✅ · **컴포넌트** ai
- **무엇**: 모든 AI 호출(텍스트/JSON/스트림/임베딩) 중앙화
- **어떻게**: `generateText` / `generateJson<T>` / `streamText`(async generator) / `embed` 4개 메서드, 모델·토큰 파라미터화 — `ai/gemini.service.ts:36-108`
- **비고**: 키 없으면 경고 로그 + isAvailable()로 상위 분기

### PULSE-209 · RAG 문서 검색 (pgvector kNN)
**타입** Story · **상태** ✅ · **컴포넌트** chat
- **무엇**: 쿼리 임베딩 → 최근접 글 topK(기본 8) 조회
- **어떻게**: `embedQuery`(RETRIEVAL_QUERY) → raw SQL `ORDER BY embedding <=> $1::vector LIMIT $2`, embedding NOT NULL 필터 — `chat.service.ts:34-47`

### PULSE-210 · RAG 스트리밍 챗 (SSE)
**타입** Story · **상태** ✅ · **컴포넌트** chat
- **무엇**: 쿼리 → 검색된 글을 컨텍스트로 Gemini 스트리밍 답변(출처 [1][2] 표기)
- **어떻게**: 검색 결과를 `[i] 제목(출처,날짜)+요약+URL`로 조립 → `streamText`(maxTokens 1000) → SSE `data:{delta}` / `[DONE]` — `chat.service.ts:50-68`, `chat.controller.ts:16-31`
- **트리거**: `POST /chat/stream {query}`
- **비고**: 컨텍스트 외 추측 금지·em dash 금지 시스템프롬프트. 임베딩 미설정 시 폴백 없음(에러)

---

## 하드코딩·알려진 한계

| 항목 | 값/상태 | 위치 |
|---|---|---|
| 요약 모델 | gemini-2.5-flash-lite | ai/gemini.service.ts |
| 임베딩 모델/차원 | text-embedding-004 / 768 | ai/gemini.service.ts |
| 요약 큐 rate limit | 분당 10, concurrency 2 | summarization.processor.ts |
| 본문 fetch | 12초·5MB·최대 1200자 | article-fetch.service.ts |
| 보호 매체명 | 14개 하드코딩 (동적화 TODO) | translation.service.ts:16-27 |
| 임베딩 폴백 | **없음** (skip 후 reanalyze 수동) | embedding.service.ts |
| 혼합 언어 판정 | 한글 1자만 있어도 ko (단순화) | translation.service.ts:30 |


---

# EPIC-3 · 콘텐츠 도메인 A (GitHub 레포 · 글 API · 데일리 다이제스트)

**컴포넌트**: `repos/*`, `articles/*`, `digest/*`

---

## GitHub 트렌딩 레포

### PULSE-301 · GitHub Trending HTML 스크래핑
**타입** Story · **상태** ✅ · **컴포넌트** repos
- **무엇**: github.com/trending 공개 페이지를 긁어 리포 정보 추출 (API 토큰 불필요)
- **어떻게**: axios + cheerio, 타임아웃 15초, UA 헤더, `article.Box-row` 선택자로 각 리포 파싱 — `repos/github-trending.service.ts:31-38`
- **트리거**: ReposCron 일일 08:30 / `POST /repos/sync`
- **비고**: 페이지 DOM 변경 시 0건 위험 (방어: 0건이면 warn, 기존 데이터 유지)

### PULSE-302 · 리포 메타데이터 파싱
**타입** Task · **상태** ✅ · **컴포넌트** repos
- **무엇**: HTML에서 owner/name, 설명, 언어, 언어색, star/fork 추출
- **어떻게**: href→owner/name, `[itemprop=programmingLanguage]`, `.repo-language-color` style 정규식, star/fork는 href 패턴 우선 + a.Link--muted 인덱스 fallback — `github-trending.service.ts:52-99`
- **비고**: 선택자 이중화로 DOM 변형 대응

### PULSE-303 · 숫자 정규화 (1.2k → 1200)
**타입** Task · **상태** ✅ · **컴포넌트** repos
- **어떻게**: 정규식 `([\d.]+)\s*(k)?`, comma 제거 후 k면 ×1000 — `github-trending.service.ts:102-108`

### PULSE-304 · velocity(periodStars) 추출
**타입** Story · **상태** ✅ · **컴포넌트** repos
- **무엇**: "X stars today/this week" — 기간 내 증가 star를 별도 기록 (절대 star가 아닌 **성장 속도**가 핵심 지표)
- **어떻게**: `.float-sm-right` 텍스트 → num() — `github-trending.service.ts:81`
- **비고**: 이 필드가 EPIC-5 레포 카드의 "▲ +N" 정렬 기준

### PULSE-305 · 설명 이모지·장식문자 정제
**타입** Task · **상태** ✅ · **컴포넌트** repos
- **어떻게**: `stripEmoji()` — `\p{Extended_Pictographic}` 등 제거 + 공백 정제, 빈 문자면 null — `repos.service.ts:37-42`

### PULSE-306 · 카테고리 자동 분류 (규칙 기반)
**타입** Story · **상태** ✅ · **컴포넌트** repos
- **무엇**: name+description 정규식 매칭으로 ai/web/infra/cli/data 분류, 미매칭은 etc
- **어떻게**: `CATEGORY_RULES` 위에서부터 첫 매칭(ai 최우선) — `repos.service.ts:5-34,77`
- **비고**: ⚠️ 규칙 협소 → 상당수 etc로 빠짐 (개선 후보: 룰 확장 또는 LLM 분류)

### PULSE-307 · 일/주간 트렌딩 전체 교체
**타입** Story · **상태** ✅ · **컴포넌트** repos
- **무엇**: 누적 없이 통째 교체 — 개인 프로젝트 데이터 누적 회피
- **어떻게**: `refresh(period)` → fetch → 트랜잭션 내 deleteMany(period) → createMany(category·stripEmoji 적용) — `repos.service.ts:54-84`
- **트리거**: 08:30 cron / `POST /repos/sync`
- **비고**: syncing 플래그로 중복 호출 방어, ~50행 상시 유지

### PULSE-308 · 트렌딩 조회 API (필터)
**타입** Story · **상태** ✅ · **컴포넌트** repos
- **무엇**: 기간/언어/카테고리 필터 조회, rank 정렬
- **어떻게**: `GET /repos?period=weekly&language=Python&category=ai`, period는 'weekly'만 특별처리 나머지 daily — `repos.service.ts:104-114`, `repos.controller.ts:9-15`

### PULSE-309 · 수동 동기화 엔드포인트
**타입** Task · **상태** ✅ · **컴포넌트** repos
- **어떻게**: `POST /repos/sync` → refreshAll(), `{daily:N, weekly:M}` 반환, 동시호출 시 `skipped:true` — `repos.controller.ts:18-22`

---

## 글 API (Articles)

### PULSE-310 · 글 목록 조회
**타입** Story · **상태** ✅ · **컴포넌트** articles
- **어떻게**: `GET /articles?source=&limit=`(기본 30·최대 100), provider 필터, publishedAt 최신순, source include — `articles.controller.ts:9-16`

### PULSE-311 · 글 단건 조회
**타입** Task · **상태** ✅ · **컴포넌트** articles
- **어떻게**: `GET /articles/:id`, findUnique + source 전체 — `articles.controller.ts:19-25`

---

## 데일리 다이제스트

### PULSE-312 · 오늘 다이제스트 조회
**타입** Story · **상태** ✅ · **컴포넌트** digest
- **어떻게**: `GET /digest/today` → getForDate(today, 00:00 정규화), 없으면 null — `digest.controller.ts:9-12`, `daily-digest.service.ts:251-253`

### PULSE-313 · 다이제스트 수동 생성/강제 갱신
**타입** Task · **상태** ✅ · **컴포넌트** digest
- **어떻게**: `POST /digest/generate?force=1` — force면 덮어쓰기, 아니면 이미 있으면 스킵 — `digest.controller.ts:15-18`

### PULSE-314 · 당일 글 수집 (다이제스트 입력)
**타입** Task · **상태** ✅ · **컴포넌트** digest
- **무엇**: 그날 fetchedAt 또는 publishedAt 글 최대 30개
- **어떻게**: dayStart 계산 → OR 조건 findMany, take 30, source include — `daily-digest.service.ts:61-90`
- **비고**: 0개면 null 반환하고 생성 중단

### PULSE-315 · 중복 생성 방지
**타입** Task · **상태** ✅ · **컴포넌트** digest
- **어떻게**: 같은 date findUnique, `existing && !force`면 기존값 반환 — `daily-digest.service.ts:66-72`

### PULSE-316 · Gemini 다이제스트 생성
**타입** Story · **상태** ✅ · **컴포넌트** digest
- **무엇**: 오늘 글 중 5개 선별 + headline/takeaway/intro 작성
- **어떻게**: 글을 `id|제목|소스|태그`로 압축(요약 제외해 토큰 절약), 에디터 시스템프롬프트, `generateJson<DigestPayload>`(maxTokens 8000), validIds 체크 후 max 5개 → upsert — `daily-digest.service.ts:92-158`
- **트리거**: 09:30 cron / API
- **비고**: 실패 시 휴리스틱 폴백(PULSE-317)

### PULSE-317 · 휴리스틱 다이제스트 폴백 (무료)
**타입** Story · **상태** ✅ · **컴포넌트** digest
- **무엇**: Gemini 없거나 실패 시 규칙 기반 선별
- **어떻게**: `isAvailable()` false거나 catch 시 `generateHeuristic()` — `daily-digest.service.ts:93-94,122-126,160-244`

### PULSE-318 · 휴리스틱 점수식 + 쏠림 방지
**타입** Story · **상태** ✅ · **컴포넌트** digest
- **무엇**: 소스 신뢰도·최신성·한국어화로 5개 선별, 소스당 최대 2개
- **어떻게**: **점수 = SOURCE_WEIGHT + recency + koBonus + tagBonus**
  - SOURCE_WEIGHT: GeekNews 5 / HN·TechCrunch·D2·토스·카카오·우아한·OpenAI·DeepMind 4 / … 기본 2 — `:177-191`
  - recency: `max(0, 4 - ageHours/12)` (이틀이면 소멸) — `:196`
  - koBonus 1.5(한국어), tagBonus `min(tags,3)*0.3` — `:198-199`
  - perSource Map으로 소스당 2개 제한 → 5개 — `:204-213`
  - headline=(titleKo??title) 60자, takeaway=summaryOneLine 80자(URL/메타면 빈문자), intro=고정문구 — `:215-228`
- **비고**: takeaway는 비어 있을 수 있음 (소스명 fallback 안 함)

### PULSE-319 · 일일 다이제스트 cron
**타입** Story · **상태** ✅ · **컴포넌트** digest
- **어떻게**: `@Cron('30 9 * * *', Asia/Seoul)` → generateForToday (09:00 수집 30분 후) — `daily-digest.cron.ts:12-15`


---

# EPIC-4 · 콘텐츠 도메인 B (영상 · 컨퍼런스 · 공통 유틸)

**컴포넌트**: `videos/*`, `conferences/*`, `common/*`

```
영상 분석 3-tier:  ① youtubei.js 공식 챕터 ─실패▶ ② description 정규식 파싱 ─실패▶ ③ Gemini 자막 분석
컨퍼런스 이미지:   og:image 추출 ─▶ Vibrant 팔레트 ─▶ OKLCH 브랜드색 자동 추출
```

---

## 영상 (Videos)

### PULSE-401 · YouTube 채널 영상 동기화
**타입** Story · **상태** ✅ · **컴포넌트** videos
- **무엇**: 컨퍼런스 YouTube 채널 최신 N개 영상 메타를 upsert
- **어떻게**: YouTube Data API `search.list`(channelId, order=date)→videoId, `videos.list`(contentDetails/statistics/snippet)로 보강, ISO8601 duration→초, 썸네일 maxres→high→…fallback — `youtube-sync.service.ts:71-155`
- **트리거**: `POST /videos/sync` / cron 월요일 04:00 KST
- **비고**: YOUTUBE_API_KEY 없으면 skip. 컨퍼런스 imageUrl 비었으면 첫 영상 썸네일로 자동 채움

### PULSE-402 · 공식 챕터 추출 (Tier 1, 무료)
**타입** Story · **상태** ✅ · **컴포넌트** videos
- **무엇**: youtuber가 직접 박은 공식 타임스탬프 추출
- **어떻게**: youtubei.js `Innertube.getInfo` → info.chapters / decorated_player_bar.chapters, ms→초 정렬 — `video-analyzer.service.ts:283-307`
- **비고**: 버전별 위치 상이 → 다중 후보 검색

### PULSE-403 · 설명 타임스탬프 파싱 (Tier 2, 무료)
**타입** Story · **상태** ✅ · **컴포넌트** videos
- **무엇**: description "[m:ss] 챕터" 패턴 추출
- **어떻게**: 정규식 줄별 매칭 → parseTimestamp, durationSec 범위·중복 제거·정렬 — `video-analyzer.service.ts:379-415`
- **비고**: 웹 `parse-chapters.ts`와 동일 로직. Tier 1 실패 시만

### PULSE-404 · Gemini AI 챕터+요약 (Tier 3)
**타입** Story · **상태** ✅ · **컴포넌트** videos
- **무엇**: 자막을 Gemini에 넣어 주제전환 기반 목차 + 요약 생성
- **어떻게**: Innertube caption_tracks→자막 XML→"[m:ss] text" 파싱(영어>한국어>첫트랙), 처음 9000자 + duration 제약 프롬프트, 5-10개 챕터, 요약은 description 180자 — `video-analyzer.service.ts:224-281,310-363`
- **비고**: 자막 없으면 실패. 키 없으면 Tier 3 skip

### PULSE-405 · 영상 수동 추가 + 자동 분석
**타입** Story · **상태** ✅ · **컴포넌트** videos
- **무엇**: YouTube URL 붙여넣기 → 메타 저장 → 분석 큐 적재
- **어떻게**: parseVideoId(watch/youtu.be/embed/shorts/live) → `Innertube.getInfo` basic_info → upsert → analyzeQueue.add — `videos.controller.ts:50-56`
- **비고**: innertube 무료 (Data API quota 미소비)

### PULSE-406 · 영상 분석 큐 (3-tier 실행)
**타입** Story · **상태** ✅ · **컴포넌트** videos
- **어떻게**: BullMQ `video-analyze` concurrency 2, analyzedAt 있으면 skip(force 무시), chapters/chapterSource/summary 저장 — `video-analysis.processor.ts:11-35`

### PULSE-407 · 미분석 일괄 분석
**타입** Task · **상태** ✅ · **컴포넌트** videos
- **어떻게**: `POST /videos/analyze-all?force=1` — analyzedAt null만(force면 전체), take 500 — `videos.controller.ts:89-104`

### PULSE-408 · 영상 목록/상세/삭제
**타입** Story · **상태** ✅ · **컴포넌트** videos
- **어떻게**: `GET /videos`(limit 20·max 100, publishedAt desc, conference 포함), `GET /videos/:id`, `DELETE /videos/:id`(hard) — `videos.controller.ts:29-46`

---

## 컨퍼런스 (Conferences)

### PULSE-409 · 컨퍼런스 시드 + 부팅 시 이미지 동기화
**타입** Story · **상태** ✅ · **컴포넌트** conferences
- **무엇**: 부팅 시 5개 한국 컨퍼런스(FECONF·if(kakao)·SLASH·DEVIEW·PyCon) upsert + 백그라운드 이미지 sync
- **어떻게**: `onApplicationBootstrap`, SEEDS(name/url/날짜/topics/brandColor/youtubeChannelId), url 기준 upsert(imageUrl 제외해 자동값 보존), fire-and-forget syncAll — `conference-seeder.service.ts:74-123`

### PULSE-410 · og:image 자동 동기화 + 브랜드색 추출
**타입** Story · **상태** ✅ · **컴포넌트** conferences
- **무엇**: imageUrl 빈 컨퍼런스의 공식 사이트 og:image 추출 → 그 이미지에서 대표색(OKLCH) 자동 추출
- **어떻게**: `OgImageService.fetch` → `BrandColorService.extractFromUrl`, 기존값 있으면 보존(force 시만 갱신) — `conference-image-sync.service.ts`
- **트리거**: 부팅 자동 / `POST /conferences/sync-images?force=1` / 승인 직후
- **비고**: og:image 없으면 graceful (failed 카운트만)

### PULSE-411 · 컨퍼런스 자동 발견 (Gemini NER)
**타입** Story · **상태** ✅ · **컴포넌트** conferences
- **무엇**: 컨퍼런스 키워드 포함 글에서 Gemini로 이벤트 메타(name/url/날짜/위치/topics) 추출
- **어떻게**: 키워드 14종 1차 필터(LLM 호출 절감) → `extractFromArticle` NER 프롬프트(미래 일정만, 밋업 제외, 4000자, maxTokens 700) — `conference-discovery.service.ts:40-63`
- **트리거**: cron 매일 00:00 KST / `POST /conferences/discover?days=&limit=`
- **비고**: 키 없으면 `[]`, 실패는 경고만

### PULSE-412 · 발견 후보 PROPOSED 저장
**타입** Story · **상태** ✅ · **컴포넌트** conferences
- **어떻게**: startDate 없으면 skip, URL 있으면 unique 매칭(없으면 `proposed://` placeholder), status=PROPOSED + discoveredFrom 기록 — `conference-discovery.service.ts:71-142`

### PULSE-413 · 승인 / 거부
**타입** Story · **상태** ✅ · **컴포넌트** conferences
- **어떻게**: `POST /conferences/:id/approve`(→ACTIVE, 이미지 sync 백그라운드), `/reject`(→REJECTED) — `conferences.controller.ts:54-70`
- **비고**: approve는 idempotent(이미 ACTIVE면 skip), REJECTED는 재제안 필터

### PULSE-414 · 컨퍼런스 목록 조회 (필터)
**타입** Story · **상태** ✅ · **컴포넌트** conferences
- **어떻게**: `GET /conferences?upcoming=1&status=ACTIVE` — 기본 ACTIVE, upcoming이면 startDate≥now, asc, take 50 — `conferences.controller.ts:22-37`

---

## 공통 유틸 (Common)

### PULSE-415 · og:image 추출 (메타 파싱)
**타입** Task · **상태** ✅ · **컴포넌트** common
- **무엇**: HTML에서 og:image / twitter:image / link rel=image_src 추출 + 절대화
- **어떻게**: axios(5초·2MB), 정규식 우선순위 파싱(대소문자 무시), absolutize(//, /, 절대) — `og-image.service.ts:12-64`

### PULSE-416 · 대표색 추출 + OKLCH 변환
**타입** Story · **상태** ✅ · **컴포넌트** common
- **무엇**: 이미지에서 Vibrant 팔레트 → 가장 선명한 색을 OKLCH CSS 문자열로
- **어떻게**: axios arraybuffer(8초·5MB) → node-vibrant getPalette(Vibrant>Muted>DarkVibrant>LightVibrant) → sRGB→linear→LMS→OKLab→OKLCH(Björn Ottosson 공식) → `oklch(L% C h)` — `brand-color.service.ts:17-88`
- **비고**: 너무 어둡거나(L<40) 채도 낮으면(C<0.05) 보정. 웹은 이 값을 CSS에 직접 사용

---

## 비용·트리거 요약

| 기능 | 트리거 | 라이브러리 | 비용 |
|---|---|---|---|
| YT 채널 동기화 | cron(주)/API | YouTube Data API v3 | quota |
| 공식 챕터 / 설명 파싱 | 큐 | youtubei.js / 정규식 | 무료 |
| AI 챕터·요약 | 큐 | Gemini Flash | 영상당 소액 |
| 컨퍼런스 NER | cron(일)/API | Gemini Flash | 글당 소액 |
| og:image / 브랜드색 | 부팅·API·승인 | axios / node-vibrant | 무료 |


---

# EPIC-5 · 웹 공개 화면 (탭 · 페이지 · 컴포넌트)

Next.js App Router. 서버 컴포넌트로 API fetch(no-store) → 클라이언트 컴포넌트로 탭/필터/상호작용. 모든 API는 실패 시 mock 데이터 폴백.

**컴포넌트**: `apps/web/src/app/*`, `apps/web/src/components/*`, `apps/web/src/lib/*`

---

## 탭 셸

### PULSE-501 · 탭 네비게이션 (6+1탭)
**타입** Story · **상태** ✅
- **무엇**: 오늘/AI/개발뉴스/컨퍼런스/발표영상/오픈소스 + 저장 탭. `?tab=` URL 상태.
- **어떻게**: 클라이언트 컴포넌트, useSearchParams/useRouter, 탭별 통계·제목 변동, 활성탭 accent 언더라인 — `articles-view.tsx:42-170,193-247`
- **비고**: 새로고침/뒤로가기 시 탭 복원. 저장 탭 배지=북마크 수

---

## 오늘의 흐름 (Overview)

### PULSE-502 · 일일 다이제스트 섹션
**타입** Story · **상태** ✅
- **어떻게**: 서버 `getDigest()`(`/digest/today`, no-store), 없으면 미렌더. 2열 그리드, Framer Motion, "오늘의 핵심" — `app/page.tsx:81-98`, `daily-digest.tsx:26-109`

### PULSE-503 · 주요 글 (featured + 목록)
**타입** Story · **상태** ✅
- **어떻게**: featured=articles[0], 나머지 2열(1:7), 카테고리 색 바, 북마크 — `overview-tab.tsx:43-88`, `featured-article.tsx`, `article-row.tsx:26-178`

### PULSE-504 · 곧 열리는 컨퍼런스 (3개)
**타입** Story · **상태** ✅
- **어떻게**: daysUntil≥0 필터·정렬, 브랜드색 카드, "더 보기"→컨퍼런스 탭 — `overview-tab.tsx:46-104`, `conference-card.tsx`

### PULSE-505 · 최신 발표 영상 (3개)
**타입** Story · **상태** ✅
- **어떻게**: videos.slice(0,3), 썸네일 로드 실패 시 브랜드 그라데이션 폴백, formatDuration — `overview-tab.tsx:107-120`, `video-card.tsx:28-173`

---

## AI 탭 (Trend Radar)

### PULSE-506 · 벤치마크 대시보드 (정적)
**타입** Story · **상태** ✅
- **무엇**: 4지표(종합지능/코딩/속도/가성비) 토글, 막대·산점도 차트
- **어떻게**: useState view 토글, max 정규화 너비, SVG 산점도, 벤더별 색 범례 — `benchmark-dashboard.tsx:23-212`
- **비고**: ⚠️ **데이터는 `lib/benchmark-data.ts` 정적 하드코딩** (Artificial Analysis 수동 스냅샷, 자동 갱신 없음 — `/api/benchmarks` 라우트는 TODO 주석만)

### PULSE-507 · AI 글 3축 필터
**타입** Story · **상태** ✅
- **무엇**: 모델(Claude/GPT/Gemini/Llama…) · 하네스(Claude Code/Cursor…) · 주제(릴리스/에이전트/벤치마크/연구) + 검색 + 페이지네이션
- **어떻게**: useMemo 옵션 계산, isAiArticle() 선필터, modelsOf/harnessesOf/themesOf 정규식 매칭 — `ai-tab.tsx:71-160`, `lib/ai-topics.ts:13-72`
- **비고**: 필터 없으면 주제별 섹션, 있으면 평탄 리스트

### PULSE-508 · AI 글 배지
**타입** Task · **상태** ✅
- **어떻게**: badgesOf = models+harnesses 최대 2개, ArticleRow badges prop — `ai-tab.tsx:133-136`

---

## 개발뉴스 탭 (Articles)

### PULSE-509 · 필터 사이드바 (소스·카테고리·본 글 숨기기)
**타입** Story · **상태** ✅
- **어떻게**: 범용 FilterSidebar, 소스/카테고리 dot 색, `#AI`/`#ai` 대소문자 정규화 병합, lg sticky·모바일 토글 — `filter-sidebar.tsx:34-204`, `articles-tab.tsx:53-89`

### PULSE-510 · 머리기사 + 시간대 그룹화
**타입** Story · **상태** ✅
- **어떻게**: 필터 없고 1페이지면 featured + 시간대 섹션(방금/오늘/어제/이번주/그외), 필터 시 검색결과 리스트, 조건 변하면 1페이지 리셋 — `articles-tab.tsx:127-132`, `lib/group-articles.ts`

### PULSE-511 · 사이드바 하단 위젯
**타입** Task · **상태** ✅
- **어떻게**: 컨퍼런스·영상 미니 미리보기, onNavigate 탭 전환 — `sidebar-widgets.tsx`

---

## 컨퍼런스 / 영상 / 오픈소스 탭

### PULSE-512 · 컨퍼런스 탭 (기간·주제 필터)
**타입** Story · **상태** ✅
- **어떻게**: periodOf()로 daysUntil 분류, 가까운순/나중순 정렬, 미래만 — `tabs/conferences-tab.tsx:9-70`

### PULSE-513 · 영상 탭 (채널·주제 필터)
**타입** Story · **상태** ✅
- **어떻게**: channelOptions/topicOptions 집계, 최신순/조회수순 — `tabs/videos-tab.tsx:8-95`

### PULSE-514 · 오픈소스 탭 (기간 토글 + 필터)
**타입** Story · **상태** ✅
- **어떻게**: 주간/일간 세그먼트 토글(전환 시 필터 초기화), 언어·분야 필터, "star 증가 속도 기준" 안내 — `tabs/repos-tab.tsx:23-83`

### PULSE-515 · 레포 카드
**타입** Story · **상태** ✅
- **어떻게**: owner/repo + 설명 2줄 + 메타(▲star증가·기간/총star/fork), 언어색 dot, fmtK() — `repo-card.tsx:20-128`

### PULSE-516 · 저장한 글 탭
**타입** Story · **상태** ✅
- **어떻게**: ArticlesTab 재사용 + bookmarkSet 필터, 빈 상태 라벨 — `articles-view.tsx:321-330`

---

## 상세 페이지

### PULSE-517 · 글 상세 (백엔드 fetch + mock 폴백)
**타입** Story · **상태** ✅
- **어떻게**: `GET /articles/{id}` + getAll 병렬(no-store), 404면 notFound(), mapDbToDto null 안전 — `app/articles/[id]/page.tsx:43-67`

### PULSE-518 · 글 상세 콘텐츠 + 읽기추적
**타입** Story · **상태** ✅
- **어떻게**: 제목(한/영) + 메타 + 3줄/한줄 요약 + 원본링크, readingMinutes 계산, useEffect로 readTracking.add — `article-detail.tsx:14-100`

### PULSE-519 · 관련 글 (4개)
**타입** Task · **상태** ✅
- **어떻게**: 같은 소스 or 태그 겹침 필터 — `app/articles/[id]/page.tsx:87-94`

### PULSE-520 · 영상 상세 (플레이어 + 챕터)
**타입** Story · **상태** ✅
- **어떻게**: `GET /videos/{id}`, YouTube iframe embed, 챕터(출처별)·요약·관련영상 5개 — `app/videos/[id]/page.tsx:30-92`, `video-detail.tsx`

### PULSE-521 · 컨퍼런스 전용 페이지
**타입** Story · **상태** ✅
- **어떻게**: 히어로 2개(좌우 대칭, D-day 큰 숫자, brand glow) + 분기별 섹션(이번분기/그이후/지난) — `conferences-view.tsx:30-36,142-330`

---

## RAG 챗 UI

### PULSE-522 · inline-chat (폼 + 빠른 질문)
**타입** Story · **상태** ✅
- **어떻게**: forwardRef + useImperativeHandle ask(), QUICK_PROMPTS 4개 — `inline-chat.tsx:81-370`

### PULSE-523 · 스트리밍 대화 + mock 폴백
**타입** Story · **상태** ✅
- **어떻게**: `POST /chat/stream` SSE 수신, 실패 시 mock 응답, AnswerText로 텍스트+인용번호 — `inline-chat.tsx` send()

### PULSE-524 · 인용 카드 (스크롤 연동)
**타입** Task · **상태** ✅
- **어떻게**: CitationGrid 최대 4개, 클릭 시 scrollIntoView + 2.2초 하이라이트 — `inline-chat.tsx:347-352`

---

## 공유 lib · 로컬 상태

### PULSE-525 · API 클라이언트
**타입** Task · **상태** ✅
- **어떻게**: `API_BASE = NEXT_PUBLIC_API_BASE || localhost:4000/api/v1`, 모든 getter mock 폴백 — `lib/api.ts`

### PULSE-526 · localStorage 상태 (북마크·읽음·언어)
**타입** Story · **상태** ✅
- **어떻게**: bookmark.ts(`devbrief.bookmarks.v1`), read-tracking.ts(`pulse.read.v1`), lang-context.tsx(`devbrief.lang`) — Set 직렬화, typeof window 가드, quota 에러 무시
- **비고**: 읽음 추적은 서버 ReadingEvent와 미동기(클라이언트 로컬만)

### PULSE-527 · 분류·포맷 유틸
**타입** Task · **상태** ✅
- **어떻게**: category.ts(7카테고리 OKLCH), group-articles.ts(시간대·상위태그), relative-time/format-duration/format-views, parse-chapters(웹↔API 공유 로직), source-colors(20소스 색) — `lib/*`

### PULSE-528 · 접근성·국제화
**타입** Task · **상태** ✅
- **어떻게**: aria-label/aria-pressed/sr-only 스킵링크, pickTitle(lang)로 한/영 제목 선택, 로케일 포맷터 — 전역


---

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


---

# 페이지별 사용성·개선점·실용성 감사

실제 브라우저(playwright, 데스크탑 1440px + 모바일 390px)로 **전 페이지를 빠짐없이 전수조사**해 점검한 결과. 추측이 아니라 **실제 화면 관찰** 기반. (점검일: 2026-06-17~18, web:3001 / api:4000)

**전수 범위**: 공개(홈·AI·개발뉴스·오픈소스·컨퍼런스탭/전용·영상탭·저장탭·글상세·영상상세) + Admin(로그인·대시보드·소스·영상·컨퍼런스후보·RAG챗) + 모바일.

> 표기: ✅ 잘 됨 · ⚠️ 개선점 · 🐞 버그/오류 · 💡 실용성 제안
> 개선 항목엔 `UX-NNN` ID를 붙여 하단 우선순위 백로그와 연결.

---

## 전 페이지 공통

- ✅ 다크 헤더 + 라이트 본문, OKLCH 인디고 액센트, 여백·타이포 일관. 디자인 완성도 높음.
- ✅ 푸터에 "다음 갱신 16시간 뒤 / 수집 주기 매일 09:00" — 살아있는 서비스 느낌.
- ⚠️ **UX-001 · "전체 100"의 함정**: 모든 통계가 `전체 100`으로 표시되나 실제 DB는 537건. API limit 100 캡이 "전체"로 보여 데이터가 적어 보임. → "최근 100" 또는 실제 총계 노출.
- 🐞 **UX-002 · 오늘 다이제스트 미생성**: `/digest/today`가 빈 응답 → 홈 다이제스트 섹션이 통째로 사라짐. 메인 상단의 핵심 기능이 비어 보임. (cron 미실행 또는 당일 글 0 처리) → 폴백 표시 또는 최근 다이제스트 노출.
- ⚠️ **UX-003 · 콘솔 info 2건**: 에러·경고는 0(양호), info 로그만 잔존.

---

## 1. 홈 / 오늘 (`/?tab=all`)

**사용성**: ✅ 머리기사 큰 카드 → 주요 글 2열 → 컨퍼런스 3 → 영상 3, 위→아래 스캔 흐름 자연스러움.

- 🐞 **UX-010 · 컨퍼런스 카드 이미지 오매칭**: PyCon Korea 2026 카드에 **Lovable 홍보 이미지**("Build apps by chatting with AI"), SLASH 26에 "FOSS BITTER MARKET" 등 무관한 이미지. og:image/첫영상 썸네일 자동 추출이 엉뚱한 걸 가져옴. **가장 눈에 띄는 신뢰도 훼손.** → 매칭 검증 또는 brandColor 그라데이션으로 통일(컨퍼런스 전용 페이지처럼).
- ⚠️ **UX-011 · 주요 글 저품질 편중**: 머리기사 빼고 6개 중 5개가 dev.to 초급글("자바 지도", "Java의 맵이란?", "스마트 계약으로 은행 불필요"). 한국 개발자 큐레이션 정체성과 안 맞음. → dev.to 가중치 하향 또는 품질 필터.
- ⚠️ **UX-012 · 영상 대표성 부족**: 발표 영상 전부 `[ifkakao2021]` 블록체인, 조회수 8~20회. 2021년·단일주제·저조회. → 최신/대표 영상 큐레이션(재생목록 기반).
- ⚠️ **UX-013 · 요약 추출 티**: "🚀 @modhamanish/rn-network-logger 소개…" 처럼 이모지+영문 첫 문장 그대로. 무료 추출식 한계(첫 문장≠요약).

**실용성**: 💡 머리기사가 개발뉴스 탭과 **중복**(같은 NAVER 글). 홈만의 차별 콘텐츠(예: 오늘의 다이제스트)가 비어 있어 홈 고유 가치가 약함 → UX-002 해결이 곧 홈 실용성.

---

## 2. AI 탭 (`/?tab=ai`)

**사용성**: ✅ 상단 벤치마크 막대차트 → 좌측 3축 필터(모델/하네스/주제) → 주제별 섹션. 정보 구조 우수.

- ✅ 벤치마크 차트(Claude Opus 4.8 / GPT-5.5 …) 막대 비교 깔끔, 지표 토글 4종.
- ⚠️ **UX-020 · 벤치마크 정적**: `lib/benchmark-data.ts` 하드코딩(2026-06 스냅샷), 자동 갱신 없음. 시간 지나면 낡음. → 분기 수동 갱신 캘린더 또는 출처 "스냅샷 날짜" 명시 강화.
- ⚠️ **UX-021 · "그 외 소식" 비대**: AI 글 다수가 모델/하네스/주제 3축에 안 걸려 최하단 "그 외"로 쏠림 = 분류 정규식 커버리지 부족. → 패턴 확장.

**실용성**: ✅ 모델·도구별 필터는 AI 팔로워에게 실질 가치. 벤치마크는 면접/트렌드 파악용으로 유용.

---

## 3. 개발 뉴스 탭 (`/?tab=articles`)

**사용성**: ✅ 좌측 필터(소스 카운트: GeekNews 27·dev.to 24·HN 24…, 카테고리 #AI 18…) + "본 글 숨기기" + 사이드 위젯. 본문은 머리기사 + 시간대 그룹("어제") + 2열 + 페이지네이션(1…5).

- ✅ 소스·카테고리에 건수 배지 → 필터 예측 가능.
- ⚠️ **UX-030 · dev.to 본문 도배**: 시간 정렬이라 최근 수집된 dev.to가 본문 상위 독식. → 소스 다양성 보정 또는 기본 정렬에 큐레이션 가중치.
- 💡 **UX-031 · 머리기사 중복**: 홈과 동일 머리기사 반복. 탭별 머리기사 차등화 검토.

**실용성**: ✅ 소스/태그 필터 + 읽음 숨기기 = 매일 훑기에 실용적.

---

## 4. 오픈소스 탭 (`/?tab=repos`)

**사용성**: ✅ "급성장 오픈소스 / 절대 규모가 아니라 증가 속도로 잡습니다" 설명 + 이번주·오늘 토글 + 언어/분야 필터. velocity `▲ +12,422 stars·이번주` 강조.

- ✅ velocity 컨셉이 카피·UI로 명확히 전달됨. 차별 포인트.
- ⚠️ **UX-040 · 레포 설명 미번역**: 글은 한국어인데 레포 설명은 영문 그대로("AI agent skill that researches…"). 서비스 일관성 깨짐. → 레포 description도 번역 큐 태움.
- ⚠️ **UX-041 · 분야 편중·라벨 혼용**: 19개 중 14개 "AI"(GitHub 트렌딩 특성상 자연스럽지만), 나머지 "인프라/기타"로 협소. 분야 라벨이 영문 "AI" + 한글 "인프라/기타" 혼용. → 룰 확장 + 라벨 통일.

**실용성**: ✅ "작아도 크는 레포" 발굴은 트렌딩 사이트와 차별되는 실질 가치.

---

## 5. 글 상세 (`/articles/[id]`)

**사용성**: ✅ 뒤로가기 → 카테고리·소스·시간·읽기시간 → 제목(한/영) → 핵심 요약 박스 → 원문 CTA. 중앙 정렬, 여백 좋음.

- ✅ **UX-050(완료) · "자동 요약" 라벨**: 기존 거짓 "AI · Gemini" → "자동 요약"으로 수정 반영 확인.
- ⚠️ **UX-051 · 본문 전문 부재**: 페이지에 요약 3줄 + 원문링크가 전부. 정작 읽을 본문이 없는데 "**5분 읽기**"로 표시(실제 페이지 체류는 10초). 라벨이 오해를 부름. → "원문 5분" 등으로 문구 조정 또는 본문 발췌 더 노출.
- ⚠️ **UX-052 · 추출 요약 품질**: 한국어 원문 글은 본문 첫 문장을 그대로 잘라("발표 내용…", "발표 대상…" 소제목 혼입). 압축 아님.

**실용성**: 💡 결국 원문으로 나가야 해서 상세페이지 자체 가치가 얇음. 요약 품질(UX-052)이 곧 상세페이지 존재 이유.

---

## 6. 컨퍼런스 전용 페이지 (`/conferences`)

**사용성**: ✅ 히어로 2개(좌우 대칭) + 큰 D-day 숫자(60/80) 브랜드 그라데이션 → "이번 분기 2" → "그 이후 1". 시각적으로 가장 완성도 높은 페이지.

- ✅ D-day 대형 숫자 임팩트, 분기별 구획 명확.
- 🐞 **UX-060 · 이미지 표현 비일관**: 같은 컨퍼런스가 **홈 카드는 (엉뚱한) og:image**, **이 페이지는 brandColor 그라데이션**으로 다르게 보임. → 표현 통일(권장: 그라데이션, UX-010과 함께 해결).
- ⚠️ **UX-061 · 정보밀도 낮음**: 히어로 블록이 화면을 크게 차지하는데 담긴 정보는 D-day뿐. 스크롤 길어짐. → 블록에 핵심 토픽/등록 링크 추가.

**실용성**: ✅ 한국 주요 컨퍼런스 D-day 한눈에 = 실질 유용. 단 5개로 적음(시드 5 + 자동발견).

---

## 7. RAG 챗 (`/chat`)

- 🐞 **UX-070 · 공개 챗 경로가 admin 뒤**: `/chat` 진입 시 `/admin/login?from=/admin/chat`으로 리다이렉트. 공개 사용자는 챗 불가(의도면 OK, 버그면 수정). 공개 네비에 챗 링크 없음. → 의도 확정 후 정리(공개 노출할지/완전 admin 전용으로 명시할지).

**실용성**: 💡 RAG 챗은 수집 글 대상 자연어 질의로 차별 기능인데 공개에서 숨겨져 활용도 0. AI 키 단가 우려라면 "관리자 전용" 명시.

---

## 8. Admin (`/admin/*`)

**사용성**: ✅ 좌측 사이드바(대시보드/컨퍼런스 후보/영상/RSS/RAG) + 진행률 바 + 6 stat 카드 + 빠른작업. 1인 운영 도구로 충분.

- ✅ "1인 운영 어드민 · 가공 결과만 메인에 노출" 안내, 기본 비번 'pulse'로 접근(운영 시 교체 필요 — EPIC-6 기재).
- 🐞 **UX-080 · "분당 N건" 3중 불일치**: 대시보드 UI "분당 4건" / 코드 주석 "분당 4개" / 실제 limiter `max:10`(분당 10건). 누군가 10으로 올리며 UI·주석 미수정. → UI·주석을 10으로 통일.
- ⚠️ **UX-081 · 진행률 기준 모호**: "AI 요약/번역 진행 94/100·94%"가 **노출 캡 100 기준**(전체 537 아님). 전체 진행률로 오인. → 분모를 실제 총계로.
- ✅ stat에 "오늘 다이제스트 0 미생성" 노출 → 운영자가 UX-002를 즉시 인지 가능(좋은 관제).

**실용성**: ✅ 소스 추가·컨퍼런스 승인·영상 추가를 한 곳에서 → 운영 효율 양호.

---

## 9. 모바일 반응형 (390px)

**사용성**: ✅ 2열 → 1열 reflow 정상, 필터가 "필터" 드롭다운 토글로 접힘(정상 작동), 머리기사·카드 가독성 유지.

- ⚠️ **UX-090 · 상단 탭바 잘림**: 7개 탭(오늘/AI/개발뉴스/컨퍼런스/발표영상/오픈소스/저장)이 모바일 폭 초과 → "개발 뉴…"에서 잘림, 가로 스크롤 필요(스크롤 단서 약함). → 스크롤 힌트(페이드) 또는 탭 축약/아이콘.

**실용성**: ✅ 출근길 모바일 훑기 가능 수준.

---

## 10. 영상 탭 (`/?tab=videos`)

**사용성**: ✅ 좌측 채널 필터(kakao tech·NAVER D2·PyCon Korea·FEConf + 카운트) + 3열 48개 + 정렬(최신/조회수).

- ⚠️ **UX-100 · 영상 큐레이션 편중·저조회**: kakao 채널이 `[ifkakao2021]` 블록체인 시리즈로 도배(조회수 8~20회 다수, 2021년). NAVER D2/PyCon은 다양. → 채널별 상한 또는 조회수/최신 가중치. (UX-012 확장)
- ⚠️ **UX-101 · 썸네일 품질 편차**: 일부는 정상 YouTube 썸네일, 일부는 텍스트만 있는 단조 썸네일이 섞여 그리드 인상이 들쭉날쭉.

**실용성**: ✅ 채널·주제 필터는 컨퍼런스 발표 탐색에 유효. 단 콘텐츠 신선도가 약점.

---

## 11. 영상 상세 (`/videos/[id]`)

**사용성**: ✅ 좌측 YouTube embed + 제목·메타 + "자동 요약"(라벨 수정 반영 ✓) + 타임라인 + "영상 설명 원문" 토글, 우측 채널 카드·영상 정보·관련 영상 5. 레이아웃 정돈.

- 🐞 **UX-110 · 챕터(타임라인) 미생성**: "아직 이 영상의 타임라인을 분석하지 못했어요" + 영상 정보 "타임라인 없음". 즉 영상 상세의 **핵심 차별 기능(챕터 점프)이 비어 있음**. 3-tier(공식→설명→Gemini) 결과가 0. → 챕터 보유 영상 우선 노출 또는 분석 재시도.
- ✅ 빈 상태 UI("YouTube에서 전체 보기")는 깔끔하게 처리됨.
- ⚠️ **UX-111 · 관련 영상 단조**: 관련 5개가 전부 같은 ifkakao 시리즈 → 탐색 확장성 낮음.

**실용성**: 💡 챕터가 비면 결국 YouTube로 나가야 해 상세 가치가 얇음. UX-110이 핵심.

---

## 12. 저장한 글 탭 (`/?tab=saved`)

- ✅ **UX-120**: "저장한 글 0 / 북마크 아이콘을 눌러 모아 보세요" 빈 상태 안내 명확.
- ⚠️ 빈 상태에서도 검색창·"본 글 숨기기" 필터가 노출됨(빈 목록엔 불필요) — 사소.

**실용성**: ✅ localStorage 기반이라 로그인 없이 즉시 동작. 단 기기 간 동기 안 됨(서버 미연결, PULSE-615와 연결).

---

## 13. Admin 상세 패널 (전수 보강)

### 13-1. RSS 소스 관리 (`/admin/sources`)
- ✅ URL 입력 → "피드 찾기"/"바로 등록", 소스 15개 인라인(활성·끄기·삭제). **Anthropic 비활성 정상 표시**(RSS 404 자동).
- 💡 **UX-130 · dev.to 활성**이 큐레이션 편중(UX-011/030)의 근원 — 운영자가 여기서 끄거나 가중치 조정 지점.
- ⚠️ **UX-131 · 인라인 삭제 확인 부재 추정**: 소스/영상 "삭제"가 즉시 실행으로 보임 → 오클릭 위험. 확인 다이얼로그 권장.

### 13-2. 영상 관리 (`/admin/videos`)
- ✅ URL 추가 + 50개 목록, "분석됨 · 요약 있음" 배지, 3-tier 추출 순서 안내.
- 🐞 **UX-132 · "분석됨" 라벨 오해**: `analyzedAt`만 set돼도 "분석됨"으로 표시되나 실제 챕터는 0일 수 있음(공개 상세는 "타임라인 없음"). → "챕터 N개" 또는 "요약만" 등 실제 산출 표기.

### 13-3. 컨퍼런스 후보 (`/admin/conferences`)
- ✅ "대기 중인 후보 0 / 매일 자정 자동 발견" 빈 상태 + 등록 5개(brandColor dot).
- ⚠️ **UX-133 · 자동발견 산출 0**: NER 컨퍼런스 발견이 후보를 못 만들어 시드 5개로만 운영. → 키워드/소스 점검(키 만료 영향 가능).

> 🔁 **UX-060 재확인**: 같은 컨퍼런스가 **홈=og:image, 전용페이지=brandColor 그라데이션, admin=색 dot** 으로 화면마다 3가지 표현. 일관화 필요.

---

## 우선순위 개선 백로그

| ID | 항목 | 심각도 | 페이지 | 비고 |
|---|---|---|---|---|
| **UX-010** | 컨퍼런스 카드 엉뚱한 이미지(PyCon→Lovable) | 🔴 높음 | 홈 | 신뢰도 직격. 그라데이션 통일이 가장 빠름 |
| **UX-002** | 오늘 다이제스트 미생성 | 🔴 높음 | 홈/admin | 메인 핵심 기능 공백 |
| **UX-080** | "분당 4건" UI/주석 vs 코드 10건 | 🟡 중간 | admin | 문구 수정만 |
| **UX-052** | 추출 요약 품질(소제목 혼입) | 🟡 중간 | 글상세 | AI 키 복구 시 자연 해결 |
| **UX-040** | 레포 설명 미번역 | 🟡 중간 | 오픈소스 | 번역 큐 연결 |
| **UX-011/030** | dev.to 저품질 편중 | 🟡 중간 | 홈/뉴스 | 소스 가중치 |
| **UX-001/081** | "전체 100" / 진행률 분모 캡 오인 | 🟡 중간 | 공통/admin | 문구·분모 |
| **UX-012** | 영상 대표성(ifkakao 8회) | 🟡 중간 | 홈/영상 | 재생목록 수집 |
| **UX-070** | 공개 챗이 admin 뒤 | 🟢 낮음 | chat | 의도 확정 |
| **UX-060** | 컨퍼런스 이미지 표현 비일관 | 🟢 낮음 | 컨퍼런스 | UX-010과 묶음 |
| **UX-021** | AI "그 외 소식" 비대 | 🟢 낮음 | AI | 분류 패턴 확장 |
| **UX-090** | 모바일 탭바 잘림 | 🟢 낮음 | 모바일 | 스크롤 힌트 |
| **UX-051** | "5분 읽기"인데 본문 없음 | 🟢 낮음 | 글상세 | 문구 조정 |
| **UX-061** | 컨퍼런스 히어로 정보밀도 | 🟢 낮음 | 컨퍼런스 | 토픽/링크 추가 |
| **UX-110** | 영상 챕터(타임라인) 미생성 | 🟡 중간 | 영상상세 | 핵심 기능 공백, 챕터 보유분 우선 |
| **UX-132** | admin "분석됨" 라벨 오해(챕터 0인데 분석됨) | 🟡 중간 | admin | "챕터 N개" 표기 |
| **UX-133** | 컨퍼런스 자동발견 산출 0 | 🟡 중간 | admin/컨퍼런스 | NER 키/키워드 점검 |
| **UX-131** | admin 인라인 삭제 확인 부재 | 🟡 중간 | admin | 오클릭 위험, 확인 다이얼로그 |
| **UX-100/101** | 영상 저조회·블록체인 편중, 썸네일 편차 | 🟢 낮음 | 영상탭 | 채널 상한/가중치 |
| **UX-111** | 관련 영상 단조(동일 시리즈) | 🟢 낮음 | 영상상세 | 추천 다양화 |
| **UX-130** | dev.to 활성이 편중 근원 | 🟢 낮음 | admin/소스 | 끄기/가중치 |

**완료**: UX-050(요약 라벨 "자동 요약"로 수정).

가장 ROI 높은 순서: **UX-080(문구), UX-001/081(문구)** = 즉시 / **UX-010+060(컨퍼런스 이미지 그라데이션 통일)** = 신뢰도 큰 향상 / **UX-002(다이제스트)** = 홈 가치 복원.

