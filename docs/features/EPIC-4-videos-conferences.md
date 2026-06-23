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
