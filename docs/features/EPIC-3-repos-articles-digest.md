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
