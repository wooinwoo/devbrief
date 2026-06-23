# Devbrief

> 매일 쏟아지는 기술 정보를 한 곳에서. 자동으로 모으고, AI가 요약하고, 챗봇이 답한다.

RSS 글, 컨퍼런스, GitHub 트렌딩, 발표 영상을 자동 수집해 한국어로 요약하고,
pgvector 기반 RAG로 자연어 질문에 답하는 개인용 기술 큐레이션 도구입니다.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![pgvector](https://img.shields.io/badge/pgvector-RAG-4169E1)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-8E75B2?logo=googlegemini&logoColor=white)

## 이런 문제를 풀었습니다

개발자와 PM은 매일 RSS 리더, 기술 블로그, GitHub 트렌딩, 컨퍼런스 영상을 따로따로 확인합니다.
정보는 넘치는데 제목만 훑고 대부분 놓칩니다. 기존 도구는 각각 한계가 있습니다.

- RSS 리더는 원문을 그대로 쌓아둘 뿐 정리해 주지 않습니다.
- 텍스트 다이제스트 메일은 검색도 인터랙션도 안 됩니다.
- 범용 챗봇은 한국 소스에 약하고, 내가 어떤 글을 봤는지 모릅니다.

Devbrief는 여러 소스를 한 파이프라인으로 모아 **자동 수집 → AI 한국어 요약 → 의미 검색 기반 챗봇**까지
한 곳에서 처리합니다. 매일 정해진 시각에 cron이 돌아 사람 손 없이 최신 정보가 채워집니다.

## 주요 기능

코드에 실제 구현된 기능만 정리했습니다.

| 영역 | 하는 일 | 트리거 |
|---|---|---|
| **글 수집** | 다수 RSS 소스에서 신규 글 수집 → 썸네일/본문 발췌 저장 → 요약·임베딩 큐로 push | 매일 09:00 KST cron + 수동 트리거 |
| **AI 요약** | Gemini로 한국어 한 줄/세 줄 요약 + 영문 제목 번역 + 언어 판별. 실패 시 무료 경로 폴백 | 수집 직후 BullMQ 워커 |
| **의미 임베딩** | 글을 768차원 벡터로 임베딩해 pgvector 컬럼에 저장 | 수집 직후 BullMQ 워커 |
| **RAG 챗봇** | 질문을 임베딩해 코사인 유사도 Top-K 글 검색 → 컨텍스트로 Gemini 스트리밍 답변, 출처 표기 | 사용자 질의 (SSE 스트림) |
| **컨퍼런스 자동 발견** | 수집한 글 본문을 LLM NER로 분석해 미래 컨퍼런스 후보 추출 → 운영자 승인 흐름 | 매일 00:00 KST cron + 어드민 승인 |
| **GitHub 트렌딩** | `github.com/trending` 페이지 스크래핑 → daily/weekly 급성장 레포 갱신 | 매일 08:30 KST cron |
| **발표 영상 분석** | YouTube 메타 수집 → 공식 챕터/설명 타임스탬프/자막 기반 AI 챕터·요약 3단 폴백 | 매주 월 04:00 KST cron + 수동 |
| **데일리 다이제스트** | 그날 들어온 글 중 핵심 5개를 LLM이 선별해 다이제스트 카드 생성 | 매일 09:30 KST cron |
| **RSS 소스 자동 등록** | 블로그 URL만 입력하면 `<link alternate>`로 피드 자동 탐지 후 소스 등록 | 어드민에서 URL 입력 |

## 기술 스택

| 카테고리 | 사용 기술 |
|---|---|
| **프론트엔드** | Next.js 16 (App Router) / React 19 / Tailwind CSS 4 / motion |
| **백엔드** | NestJS 11 / TypeScript 5.9 / `@nestjs/schedule` (cron) |
| **DB** | PostgreSQL 16 + pgvector / Prisma ORM |
| **AI** | Gemini 2.5 Flash-Lite (요약·번역·챗봇·NER·영상 챕터) / Gemini `text-embedding-004` (768차원) |
| **큐 / 캐시** | Redis + BullMQ (수집·요약·임베딩·영상분석 워커) |
| **수집** | `rss-parser` / `cheerio` (트렌딩 스크래핑) / `youtubei.js` (YouTube 메타·자막) |
| **인프라** | Docker Compose (Postgres + Redis) / pnpm workspace 모노레포 / Biome |

## 아키텍처

### 데이터 파이프라인

```mermaid
flowchart LR
  subgraph Sources["수집 소스"]
    RSS["RSS 피드"]
    GH["GitHub Trending"]
    YT["YouTube"]
    ART["글 본문(NER)"]
  end

  subgraph Queue["BullMQ 큐 (Redis)"]
    Q1["summarization"]
    Q2["embedding"]
    Q3["video-analysis"]
  end

  subgraph AI["Gemini"]
    SUM["요약/번역"]
    EMB["text-embedding-004"]
    NER["컨퍼런스 NER"]
    VID["영상 챕터/요약"]
  end

  subgraph DB["PostgreSQL + pgvector"]
    PG[("Article / Repo / Conference / Video")]
  end

  RSS -->|cron| Q1 & Q2
  GH -->|cron| PG
  ART --> NER --> PG
  YT -->|cron| Q3 --> VID --> PG
  Q1 --> SUM --> PG
  Q2 --> EMB --> PG

  subgraph App["사용자"]
    WEB["Next.js 웹"]
    CHAT["RAG 챗봇"]
  end

  PG --> WEB
  CHAT -->|질문 임베딩| EMB
  EMB -->|벡터 유사도 Top-K| PG
  PG -->|컨텍스트| SUM
  SUM -->|SSE 스트림 + 출처| CHAT
```

요약하면, 각 cron이 소스에서 데이터를 가져와 즉시 **BullMQ 큐에 작업을 쌓고**,
워커가 비동기로 Gemini를 호출해 요약·임베딩을 채웁니다.
챗봇은 사용자 질문을 같은 임베딩 모델로 벡터화해 pgvector 코사인 유사도로 관련 글을 찾고,
그 글들을 컨텍스트로 답을 스트리밍합니다.

### 모노레포 구조

`pnpm workspace`로 4개 패키지를 묶습니다. (내부 패키지 스코프는 `@pulse/*`)

> 내부 npm 패키지 스코프 `@pulse/*`는 구 코드네임입니다. 서비스명은 Devbrief이며, 스코프 변경은 빌드 영향 범위가 커서 의도적으로 유지합니다.

- **apps/web** — Next.js 사용자 UI, 챗봇, 어드민 대시보드
- **apps/api** — NestJS 수집 파이프라인, RAG, cron, BullMQ 워커
- **packages/db** — Prisma 스키마 + 마이그레이션 (모든 앱이 공유)
- **packages/shared** — 공유 TypeScript 타입

## 기술적으로 신경 쓴 점

1. **pgvector 기반 RAG 검색.** 질문을 `RETRIEVAL_QUERY`로, 문서를 `RETRIEVAL_DOCUMENT`로 임베딩해
   `embedding <=> $1::vector` 코사인 거리로 Top-K를 뽑습니다. 검색 결과를 컨텍스트로 넣고
   답변에 `[1] [2]` 형식 출처를 강제해 환각을 줄였습니다.

2. **BullMQ 비동기 수집 파이프라인.** 수집과 AI 처리를 분리했습니다. 수집은 글을 DB에 넣고
   즉시 `summarization`/`embedding` 큐에 작업만 넣고 끝납니다. 요약 작업은 지수 백오프
   재시도(1분 → 2분 → 4분, 최대 6회)를 걸어 API 한도/일시 장애에도 유실 없이 처리됩니다.

3. **AI 실패에 대한 무료 폴백 전략.** Gemini 호출이 실패하면(키 만료/한도 초과 등) 요약이 멈추지 않고,
   비공식 번역 API(Google `translate_a` → MyMemory)와 추출식 요약(본문 앞 문장 추출 후 번역)으로
   내려갑니다. LLM 없이도 한국어 요약을 채울 수 있게 설계했습니다.

4. **3단 영상 챕터 폴백.** 영상 목차를 ① YouTube 공식 챕터 → ② 설명글 타임스탬프 파싱 →
   ③ 자막 기반 Gemini 생성 순으로 시도합니다. 무료 경로를 먼저 써서 AI 호출 비용을 아끼고,
   요약은 영상 전체 대신 설명글 기반으로 처리해 출력 토큰을 절약합니다.

5. **비공식 API 사용에 대한 인지.** GitHub 트렌딩은 공식 API가 없어 HTML 스크래핑으로,
   번역 폴백은 비공식 엔드포인트로 처리합니다. 깨질 수 있는 트레이드오프를 알고 선택한 부분이라,
   스크래핑은 견고한 셀렉터 + fallback을, 번역은 호출부 rate limit으로 IP 차단 위험을 완화했습니다.

## 로컬 실행

### 1) 인프라 (Postgres + Redis)

Postgres는 pgvector extension이 포함된 이미지를 사용합니다.

```bash
docker compose up -d
```

### 2) 설치 + 환경 변수

```bash
pnpm install
cp env.example .env
# DATABASE_URL / REDIS_URL / GEMINI_API_KEY 입력
```

| 키 | 받는 곳 | 용도 |
|---|---|---|
| `DATABASE_URL` | 로컬 docker 또는 Neon | PostgreSQL 연결 |
| `REDIS_URL` | 로컬 docker 또는 Upstash | BullMQ 큐 |
| `GEMINI_API_KEY` | https://aistudio.google.com | 요약·번역·챗봇·NER·임베딩·영상 분석 |

> `GEMINI_API_KEY`가 없어도 동작합니다. 요약은 무료 번역 폴백으로 내려가고, 의미 검색 임베딩만 skip됩니다.

### 3) DB 마이그레이션

```bash
pnpm db:generate    # Prisma Client 생성
pnpm db:migrate     # 마이그레이션 적용
```

### 4) 개발 서버

```bash
pnpm dev            # web(3000) + api(4000) 병렬 실행
```

### 5) 첫 수집 (cron 안 기다리고 수동 트리거)

```bash
curl -X POST http://localhost:4000/api/v1/ingestion/trigger
# RSS 수집 → 요약/임베딩 큐 push

curl -X POST http://localhost:4000/api/v1/conferences/discover
# 글에서 컨퍼런스 후보 추출 (PROPOSED 상태)
```

### 검증

```bash
pnpm lint && pnpm typecheck && pnpm build
```

## 폴더 구조

```text
devbrief/
├─ apps/
│  ├─ web/                 Next.js 16 (사용자 UI + 챗봇 + 어드민)
│  │  └─ src/
│  │     ├─ app/           App Router 페이지 (홈/articles/chat/conferences/videos/admin)
│  │     ├─ components/    카드/챗봇/대시보드 UI
│  │     └─ lib/
│  └─ api/                 NestJS 11 (수집 + RAG + cron + 큐)
│     └─ src/
│        ├─ ingestion/     RSS 수집 + cron + BullMQ producer
│        ├─ summarization/ Gemini 요약 + 무료 폴백 워커
│        ├─ embedding/     768차원 벡터 임베딩 워커
│        ├─ chat/          RAG 검색 + SSE 스트리밍 답변
│        ├─ conferences/   LLM NER 자동 발견 + 승인 흐름
│        ├─ repos/         GitHub 트렌딩 스크래핑
│        ├─ videos/        YouTube 메타 + 3단 챕터 분석
│        ├─ digest/        데일리 다이제스트 생성
│        ├─ sources/       RSS 피드 자동 탐지
│        └─ ai/            Gemini 호출 통합 (gemini.service)
└─ packages/
   ├─ db/                  Prisma 스키마 + 마이그레이션 (pgvector)
   └─ shared/              공유 TypeScript 타입
```
