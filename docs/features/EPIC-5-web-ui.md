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
