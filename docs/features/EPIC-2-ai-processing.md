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
