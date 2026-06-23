# Devbrief(Pulse) 기능 백로그

이 서비스에 **실제로 구현된 기능**을 JIRA 백로그처럼 잘게 쪼개 정리한 문서입니다.
코드를 직접 읽고 작성했으며, 각 태스크에 구현 파일·라인을 인용했습니다. (작성 시점 기준)

> 표기: **타입** Story(사용자 가치 단위) / Task(기술 단위) · **상태** ✅ 구현됨 · 파일경로는 저장소 루트 기준

> 📊 **태스크 113개를 한 파일에 표로 → [TASKS.md](./TASKS.md)** (에픽별 표, ID·제목·타입·구현·파일)
> 📄 **전체를 한 문서에서 보려면 → [BACKLOG.md](./BACKLOG.md)** (README + 에픽 6개 + 페이지 감사 통합)
> 🔍 **페이지별 사용성·개선점·실용성 감사 → [PAGE-AUDIT.md](./PAGE-AUDIT.md)** (전 페이지 전수조사, 13개 페이지 · 21개 개선 백로그)

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
