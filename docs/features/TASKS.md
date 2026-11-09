# Devbrief 태스크 표 (전체 113개)

전 기능을 JIRA 백로그처럼 단일 파일·표로 정리. 상태는 전부 ✅ 구현됨. 파일경로는 저장소 루트 기준.

- 상세 설명: [BACKLOG.md](./BACKLOG.md) · 페이지 감사: [PAGE-AUDIT.md](./PAGE-AUDIT.md)
- 타입: **S**(Story, 사용자 가치) / **T**(Task, 기술)

| 에픽 | 태스크 | 합계 |
|---|---|---|
| EPIC-1 | 콘텐츠 수집 파이프라인 | 21 |
| EPIC-2 | AI 처리 | 10 |
| EPIC-3 | 레포·글·다이제스트 | 19 |
| EPIC-4 | 영상·컨퍼런스·공통 | 16 |
| EPIC-5 | 웹 공개 화면 | 28 |
| EPIC-6 | Admin·DB·인프라 | 19 |
| | **총계** | **113** |

---

## EPIC-1 · 콘텐츠 수집 파이프라인

| ID | 제목 | 타입 | 구현 / 파일 |
|---|---|---|---|
| DEVBRIEF-101 | RSS 피드 파싱 | T | `rss-parser` + customFields, UA 위장 · `ingestion/rss-parser.service.ts:16` |
| DEVBRIEF-102 | RSS 이미지 추출·절대경로화 | T | enclosure→media→img 우선순위 · `rss-parser.service.ts:46` |
| DEVBRIEF-103 | 소스당 수집 상한 | S | `maxPerSource`(기본 30), 최신순 slice · `ingestion.service.ts:35` |
| DEVBRIEF-104 | URL 중복 스킵 | T | `findUnique({url})` · `ingestion.service.ts:54` |
| DEVBRIEF-105 | 본문 발췌 저장(contentSnippet) | S | HTML 제거 800자 · `ingestion.service.ts:59` |
| DEVBRIEF-106 | 아티클 메타 저장 | T | `article.create`, 제목 500자·태그 10 · `ingestion.service.ts:71` |
| DEVBRIEF-107 | 요약 큐 적재+지수 백오프 | S | attempts 6, backoff 60s · `ingestion.service.ts:85` |
| DEVBRIEF-108 | 임베딩 큐 적재 | T | `queue.add('embed')` · `ingestion.service.ts:100` |
| DEVBRIEF-109 | 전체 소스 수집 오케스트레이션 | S | active 순회 + try-catch 격리 · `ingestion.service.ts:18` |
| DEVBRIEF-110 | 일일 수집 cron | S | `@Cron('0 9 * * *')` · `ingestion.cron.ts:13` |
| DEVBRIEF-111 | 온디맨드 수집 API | T | `POST /ingestion/run`·`/run-sync` · `ingestion.controller.ts:17` |
| DEVBRIEF-112 | 요약/임베딩 재처리(reanalyze) | S | 누락분 재적재, limit 2000 · `ingestion.controller.ts:33` |
| DEVBRIEF-113 | 수집 큐 워커 | T | `@Processor('ingestion')` · `ingestion.processor.ts:14` |
| DEVBRIEF-114 | 기본 소스 시드(13) | T | bootstrap upsert · `source-seeder.service.ts:116` |
| DEVBRIEF-115 | RSS 자동 발견 | S | 3단계(직접→link→경로추측) · `rss-discovery.service.ts:31` |
| DEVBRIEF-116 | 피드 발견+자동 등록 | S | upsert, 언어 자동감지 · `rss-discovery.service.ts:54` |
| DEVBRIEF-117 | link[rel=alternate] 파싱 | T | 정규식 link 추출 · `rss-discovery.service.ts:112` |
| DEVBRIEF-118 | 경로 추측+검증 | T | /rss,/feed… 후보 검증 · `rss-discovery.service.ts:142` |
| DEVBRIEF-119 | HTML 안전 fetch | T | axios 5s·2MB·UA · `rss-discovery.service.ts:95` |
| DEVBRIEF-120 | 소스 CRUD API | S | 목록/토글/삭제 · `sources.controller.ts:21` |
| DEVBRIEF-121 | 피드 발견 API | T | discover·discover-and-register · `sources.controller.ts:28` |

## EPIC-2 · AI 처리

| ID | 제목 | 타입 | 구현 / 파일 |
|---|---|---|---|
| DEVBRIEF-201 | Gemini 고품질 요약(JSON) | S | gemini-2.5-flash-lite, generateJson · `summarization.service.ts:7` |
| DEVBRIEF-202 | 무료 경로 한국어화+추출 요약 | S | 본문 문장추출→번역→재분할 · `summarization.service.ts:85` |
| DEVBRIEF-203 | 원문 본문 fetch(cheerio) | S | article→main→p밀도 휴리스틱 · `article-fetch.service.ts:17` |
| DEVBRIEF-204 | 무료 번역(Google→MyMemory) | S | translate_a→mymemory 폴백 · `translation.service.ts:61` |
| DEVBRIEF-205 | 매체명 placeholder 보호 | T | ⟦N⟧ 마스킹·복원 · `translation.service.ts:16` |
| DEVBRIEF-206 | 한글 감지 | T | `/[가-힣]/` · `translation.service.ts:30` |
| DEVBRIEF-207 | 임베딩 생성(pgvector 768d) | S | text-embedding-004, raw SQL · `embedding.service.ts:40` |
| DEVBRIEF-208 | Gemini 통합 클라이언트 | T | text/json/stream/embed 4메서드 · `ai/gemini.service.ts:36` |
| DEVBRIEF-209 | RAG 문서 검색(kNN) | S | `embedding <=> $1::vector` · `chat.service.ts:34` |
| DEVBRIEF-210 | RAG 스트리밍 챗(SSE) | S | 컨텍스트 조립+streamText · `chat.service.ts:50` |

## EPIC-3 · 레포·글·다이제스트

| ID | 제목 | 타입 | 구현 / 파일 |
|---|---|---|---|
| DEVBRIEF-301 | GitHub Trending 스크래핑 | S | axios+cheerio, 토큰 불필요 · `github-trending.service.ts:31` |
| DEVBRIEF-302 | 리포 메타 파싱 | T | owner/lang/star 선택자 이중화 · `github-trending.service.ts:52` |
| DEVBRIEF-303 | 숫자 정규화(1.2k→1200) | T | 정규식+k×1000 · `github-trending.service.ts:102` |
| DEVBRIEF-304 | velocity(periodStars) 추출 | S | `.float-sm-right` · `github-trending.service.ts:81` |
| DEVBRIEF-305 | 설명 이모지 정제 | T | `stripEmoji` · `repos.service.ts:37` |
| DEVBRIEF-306 | 카테고리 자동 분류 | S | CATEGORY_RULES 첫매칭 · `repos.service.ts:29` |
| DEVBRIEF-307 | 일/주간 전체 교체 | S | deleteMany→createMany · `repos.service.ts:54` |
| DEVBRIEF-308 | 트렌딩 조회 API(필터) | S | period/language/category · `repos.controller.ts:9` |
| DEVBRIEF-309 | 수동 동기화 | T | `POST /repos/sync` · `repos.controller.ts:18` |
| DEVBRIEF-310 | 글 목록 조회 | S | source/limit, 최신순 · `articles.controller.ts:9` |
| DEVBRIEF-311 | 글 단건 조회 | T | findUnique+source · `articles.controller.ts:19` |
| DEVBRIEF-312 | 오늘 다이제스트 조회 | S | `GET /digest/today` · `digest.controller.ts:9` |
| DEVBRIEF-313 | 다이제스트 수동 생성 | T | `?force=1` 덮어쓰기 · `digest.controller.ts:15` |
| DEVBRIEF-314 | 당일 글 수집 | T | OR(fetchedAt/publishedAt) 30개 · `daily-digest.service.ts:61` |
| DEVBRIEF-315 | 중복 생성 방지 | T | date findUnique · `daily-digest.service.ts:66` |
| DEVBRIEF-316 | Gemini 다이제스트 생성 | S | 5개 선별 generateJson · `daily-digest.service.ts:92` |
| DEVBRIEF-317 | 휴리스틱 폴백 | S | isAvailable false/catch · `daily-digest.service.ts:160` |
| DEVBRIEF-318 | 휴리스틱 점수식+쏠림방지 | S | weight+recency+ko+tag, 소스당 2 · `daily-digest.service.ts:177` |
| DEVBRIEF-319 | 다이제스트 cron | S | `@Cron('30 9 * * *')` · `daily-digest.cron.ts:12` |

## EPIC-4 · 영상·컨퍼런스·공통

| ID | 제목 | 타입 | 구현 / 파일 |
|---|---|---|---|
| DEVBRIEF-401 | YouTube 채널 동기화 | S | search.list+videos.list · `youtube-sync.service.ts:71` |
| DEVBRIEF-402 | 공식 챕터 추출(Tier1) | S | youtubei.js chapters · `video-analyzer.service.ts:283` |
| DEVBRIEF-403 | 설명 타임스탬프 파싱(Tier2) | S | "[m:ss]" 정규식 · `video-analyzer.service.ts:379` |
| DEVBRIEF-404 | Gemini AI 챕터+요약(Tier3) | S | 자막→generateJson · `video-analyzer.service.ts:310` |
| DEVBRIEF-405 | 영상 수동 추가+자동 분석 | S | innertube→큐 · `videos.controller.ts:50` |
| DEVBRIEF-406 | 영상 분석 큐 | S | concurrency 2, analyzedAt skip · `video-analysis.processor.ts:11` |
| DEVBRIEF-407 | 미분석 일괄 분석 | T | `analyze-all?force=1` · `videos.controller.ts:89` |
| DEVBRIEF-408 | 영상 목록/상세/삭제 | S | conference 포함 · `videos.controller.ts:29` |
| DEVBRIEF-409 | 컨퍼런스 시드+부팅 이미지sync | S | 5개 upsert, fire-and-forget · `conference-seeder.service.ts:74` |
| DEVBRIEF-410 | og:image+브랜드색 동기화 | S | fetch→Vibrant→OKLCH · `conference-image-sync.service.ts` |
| DEVBRIEF-411 | 컨퍼런스 자동발견(NER) | S | 키워드필터→Gemini NER · `conference-discovery.service.ts:40` |
| DEVBRIEF-412 | 후보 PROPOSED 저장 | S | url/이름+날짜 dedup · `conference-discovery.service.ts:71` |
| DEVBRIEF-413 | 승인/거부 | S | approve→ACTIVE, reject · `conferences.controller.ts:54` |
| DEVBRIEF-414 | 컨퍼런스 목록(필터) | S | upcoming/status · `conferences.controller.ts:22` |
| DEVBRIEF-415 | og:image 추출 | T | og→twitter→image_src · `og-image.service.ts:12` |
| DEVBRIEF-416 | 대표색+OKLCH 변환 | S | Vibrant→Ottosson 공식 · `brand-color.service.ts:17` |

## EPIC-5 · 웹 공개 화면

| ID | 제목 | 타입 | 구현 / 파일 |
|---|---|---|---|
| DEVBRIEF-501 | 탭 네비(6+1) | S | useSearchParams · `articles-view.tsx:42` |
| DEVBRIEF-502 | 일일 다이제스트 섹션 | S | getDigest no-store · `daily-digest.tsx:26` |
| DEVBRIEF-503 | 주요 글(featured+목록) | S | featured+2열 · `overview-tab.tsx:43` |
| DEVBRIEF-504 | 곧 열리는 컨퍼런스(3) | S | daysUntil 필터 · `overview-tab.tsx:46` |
| DEVBRIEF-505 | 최신 발표 영상(3) | S | 썸네일 폴백 · `overview-tab.tsx:107` |
| DEVBRIEF-506 | 벤치마크 대시보드(정적) | S | view 토글, SVG · `benchmark-dashboard.tsx:23` |
| DEVBRIEF-507 | AI 글 3축 필터 | S | models/harness/themes · `ai-tab.tsx:71` |
| DEVBRIEF-508 | AI 글 배지 | T | badgesOf 최대2 · `ai-tab.tsx:133` |
| DEVBRIEF-509 | 필터 사이드바 | S | 소스/카테고리/숨기기 · `filter-sidebar.tsx:34` |
| DEVBRIEF-510 | 머리기사+시간대 그룹 | S | groupByTime · `articles-tab.tsx:127` |
| DEVBRIEF-511 | 사이드 위젯 | T | 컨퍼런스·영상 미니 · `sidebar-widgets.tsx` |
| DEVBRIEF-512 | 컨퍼런스 탭(필터) | S | periodOf · `tabs/conferences-tab.tsx:9` |
| DEVBRIEF-513 | 영상 탭(필터) | S | channel/topic · `tabs/videos-tab.tsx:8` |
| DEVBRIEF-514 | 오픈소스 탭(토글+필터) | S | 주간/일간 · `tabs/repos-tab.tsx:23` |
| DEVBRIEF-515 | 레포 카드 | S | velocity ▲, fmtK · `repo-card.tsx:20` |
| DEVBRIEF-516 | 저장한 글 탭 | S | bookmarkSet 필터 · `articles-view.tsx:321` |
| DEVBRIEF-517 | 글 상세(fetch+mock) | S | no-store, notFound · `app/articles/[id]/page.tsx:43` |
| DEVBRIEF-518 | 글 상세 콘텐츠+읽기추적 | S | readingMinutes · `article-detail.tsx:14` |
| DEVBRIEF-519 | 관련 글(4) | T | 소스/태그 매칭 · `app/articles/[id]/page.tsx:87` |
| DEVBRIEF-520 | 영상 상세(플레이어+챕터) | S | iframe, 챕터 · `video-detail.tsx` |
| DEVBRIEF-521 | 컨퍼런스 전용 페이지 | S | D-day 히어로 · `conferences-view.tsx:142` |
| DEVBRIEF-522 | inline-chat(폼) | S | forwardRef ask · `inline-chat.tsx:81` |
| DEVBRIEF-523 | 스트리밍 대화+mock | S | SSE 수신 · `inline-chat.tsx` |
| DEVBRIEF-524 | 인용 카드(스크롤) | T | scrollIntoView · `inline-chat.tsx:347` |
| DEVBRIEF-525 | API 클라이언트 | T | mock 폴백 · `lib/api.ts` |
| DEVBRIEF-526 | localStorage 상태 | S | 북마크/읽음/언어 · `lib/bookmark.ts·read-tracking.ts·lang-context.tsx` |
| DEVBRIEF-527 | 분류·포맷 유틸 | T | category/group/relative-time · `lib/*` |
| DEVBRIEF-528 | 접근성·국제화 | T | aria, pickTitle · 전역 |

## EPIC-6 · Admin·DB·인프라

| ID | 제목 | 타입 | 구현 / 파일 |
|---|---|---|---|
| DEVBRIEF-601 | Admin 인증(미들웨어 쿠키) | S | SHA-256, httpOnly 30일 · `middleware.ts:5` |
| DEVBRIEF-602 | 로그인 페이지 | T | form action, ?from · `login/page.tsx:54` |
| DEVBRIEF-603 | Admin 사이드바 | T | NAV 3구역 · `sidebar.tsx:13` |
| DEVBRIEF-604 | Admin 대시보드 | S | 7 API 병렬, 진행률 · `admin/(dashboard)/page.tsx:20` |
| DEVBRIEF-605 | RSS 소스 관리 | S | discover→register · `sources-panel.tsx:39` |
| DEVBRIEF-606 | 컨퍼런스 후보 검토 | S | approve/reject · `proposed-list.tsx:27` |
| DEVBRIEF-607 | 영상 관리 | S | URL→add, 분석상태 · `videos-panel.tsx:36` |
| DEVBRIEF-608 | Admin RAG 챗 | T | InlineChat, ?q · `admin-chat-client.tsx:10` |
| DEVBRIEF-609 | Article 모델 | T | url unique, embedding 768 · `schema.prisma` |
| DEVBRIEF-610 | Source 모델 | T | feedUrl unique, 시드 13 · `schema.prisma` |
| DEVBRIEF-611 | Repo 모델 | T | (fullName,period) unique · `schema.prisma` |
| DEVBRIEF-612 | Video 모델 | T | videoId unique, chapters Json · `schema.prisma` |
| DEVBRIEF-613 | Conference 모델 | T | url unique, status · `schema.prisma` |
| DEVBRIEF-614 | DailyDigest 모델 | T | date unique, items Json · `schema.prisma` |
| DEVBRIEF-615 | User/ReadingEvent/Chat 모델 | T | 스키마 존재, 클라 미연결 · `schema.prisma` |
| DEVBRIEF-616 | Docker(pgvector+Redis) | T | pg16+redis7, healthcheck · `docker-compose.yml` |
| DEVBRIEF-617 | NestJS 부트스트랩 | T | ValidationPipe, prefix /api/v1 · `main.ts:1` |
| DEVBRIEF-618 | Prisma 라이프사이클 | T | connect/disconnect · `prisma/prisma.service.ts` |
| DEVBRIEF-619 | 부팅 시더(소스13·컨퍼런스5) | T | onApplicationBootstrap · `*-seeder.service.ts` |

---

## 테스트 커버리지 (자동화)

| 스위트 | 테스트 | 러너 |
|---|---|---|
| API 전체 | **128** | jest |
| WEB 전체 | **45** | vitest |
| **합계** | **173** | |

신규 추가(36): 요약 헬퍼·레포 분류·번역(폴백/placeholder)·본문fetch. 상세 [PAGE-AUDIT.md](./PAGE-AUDIT.md).
