# Pulse — PRD v0.1

> 가칭 / 한국어 서브 미정 (예: "기술의 맥", "오늘의 흐름")

## 1. 제품 정의

**한 줄.** 매일 쏟아지는 기술 뉴스/아티클을 AI가 수집/요약하고, 챗봇으로 자연어 검색·큐레이션을 받는 도구.

**한 문단.** Pulse는 개발자와 PM이 매일 마주하는 정보 과부하를 해결한다. GeekNews, dev.to, TechCrunch, Product Hunt, 국내 기술 블로그 등 다중 소스에서 글을 자동 수집해 한국어로 요약하고, 사용자가 *"이번 주 Anthropic 관련 소식만"*, *"한국 개발자 블로그 핫이슈"*, *"내가 안 본 글 중 중요한 것"* 같은 자연어로 질문하면 본인이 본 글 메모리 위에서 답한다. 매일 9시 다이제스트는 단순 텍스트 메일이 아니라 챗봇 가능한 대시보드 + 시각 트렌드로 도착한다.

## 2. 페르소나

**Primary - "정보 과부하 개발자/PM"**
- 30대 프론트엔드/PM
- 매일 9시 텍스트 다이제스트 받음 (66+ 아티클)
- 제목만 훑고 90%는 못 봄
- 기존 도구 한계: RSS 리더는 정리 안 됨 / 텍스트 메일은 검색 X / ChatGPT는 내가 본 글 모름
- 핵심 가치: *"이번 주 핵심만"* + *"내 관심 있는 것만"* 5분 안에 흡수

**Secondary - "한국 기술 정보 큐레이션 받고 싶은 사람"**
- 영문 위주 큐레이션(Refind 등)은 있는데 한국어/국내 블로그 통합 도구 거의 없음
- GeekNews + 카카오/네이버/우아한형제들 블로그 + 영문 핵심을 한 곳에서

## 3. 핵심 사용자 여정 (Top 3)

**① 매일 아침 다이제스트 (Daily)**
1. 매일 9시 알림 *"오늘의 Pulse"* 도착
2. 클릭하면 시각 대시보드 진입 (주제별 카드 / 카테고리 분포 / 핫토픽)
3. 카드 클릭 → 한 줄 요약 → 3줄 요약 → 원문 링크
4. *"오늘 다 봤어요"* 마크 → 본 글 메모리 저장

**② 챗봇 자연어 큐레이션 (Daily~Weekly)**
1. 챗봇 인풋: *"이번 주 AI 모델 출시 소식 정리해줘"*
2. 본인이 본/안 본 글 구분 + 출처별 그룹 + 한국어 요약
3. 후속 질문 가능 (*"그 중 Anthropic Opus 4.8 자세히"*)
4. *"이거 나중에 읽기"* 저장

**③ 주간 인사이트 (Weekly)**
1. 매주 일요일 *"이번 주 나의 관심사"* 카드
2. AI 분석: 잭이 자주 클릭한 주제 / 안 본 트렌딩 / 다음 주 추천 키워드
3. 관심사 학습 → 다음 주 다이제스트 우선순위 반영

## 4. MVP 스코프 (5주, 단 잭의 결정으로 연장 가능)

| 주차 | 산출물 | 기준 |
|---|---|---|
| W1 | 모노레포 + Auth + 디자인 토큰 + Postgres + pgvector 셋업 | 로그인 + 보호 라우트 |
| W2 | RSS/API 수집 파이프라인 (BullMQ + Cron) + 5~7개 소스 통합 | 매일 자동 수집 + DB 저장 |
| W3 | Claude 요약 파이프라인 + 카드 UI + 다이제스트 페이지 | 한국어 한 줄/3줄 요약 자동 |
| W4 | 챗봇 + RAG (pgvector embedding) + 본 글 메모리 | 자연어 쿼리 동작 |
| W5 | 디자인 톤 입히기 + 다이제스트 알림 + 배포 | Vercel/Railway 라이브 |

**MVP에 의도적으로 안 함**
- 모바일 앱 (반응형 웹만)
- 다른 사용자 팔로우 / 소셜 피드
- 본문 전체 저장 (라이선스 이슈, 링크만)
- 유료화 / 결제

## 5. 데이터 소스

**카테고리 1 — 글/아티클 (W2 자동 수집)**
- 국내: GeekNews / 카카오 tech / 네이버 D2 / 우아한형제들 / 토스 / 당근
- 글로벌: Hacker News / dev.to / TechCrunch / ProductHunt
- AI 전용: Anthropic 블로그 / OpenAI 블로그 / Google AI 블로그

**카테고리 2 — 컨퍼런스/세미나 (MVP는 수기 시드)**
- 한국 주요 10개: FECONF / NDC / DEVIEW / if(kakao) / SLASH / 우아콘 / Spring Camp / PyCon Korea / JS Conf Korea / let's swift / droidknights
- MVP에선 잭이 수기 입력. V1.5에서 YouTube 채널 연동으로 자동화

**카테고리 3 — 밋업 (V2)**
- Festa.io / Onoffmix / GDG Korea / 모두의 연구소

**카테고리 4 — 발표 영상 (V1.5)**
- 각 컨퍼런스 YouTube 채널 새 영상 (YouTube Data API)
- 자막/트랜스크립트 RAG에 포함

**수집 원칙**: RSS feed 우선 / 공식 API 차선 / 본문 전체 저장 X (저작권) / 요약 + 원문 링크만

## 6. 비기능 요구사항

**디자인 톤** — 잭 룰 18 + 디자인 톤. 다크 기본 / 글래스모피즘 / 절제된 글로우 / 한국어 자연 카피 / em dash 금지.

**접근성** — 키보드 탐색 / 색 대비 WCAG AA / 모든 인터랙티브 alt 텍스트 / 챗봇 답변에 출처 명시.

**반응형** — 375px ~ 1920px 정상 동작. 모바일은 카드 1열, 데스크톱은 멀티 컬럼.

**성능** — 다이제스트 페이지 LCP < 2s / 챗봇 첫 응답 토큰 < 1.5s.

**비용** — 요약은 Claude Haiku 4.5 / 챗봇 답변은 Claude Sonnet 4.6 (또는 Haiku) / Embedding은 OpenAI text-embedding-3-small 또는 Voyage (한국어 좋음) / pgvector / 매일 100 사용자 기준 월 $30 이하 목표.

**개인정보** — 본 글 메모리는 사용자별 분리 / 챗봇 컨텍스트에 다른 사용자 데이터 절대 X.

## 7. 기술 스택 (확정)

```
Frontend  Next 15 App Router + Tailwind 4 + motion + (시각화: recharts 또는 visx)
Backend   NestJS + Prisma + PostgreSQL + pgvector + BullMQ + Redis
Auth      NextAuth (Google OAuth)
AI        Claude API (Haiku 요약 / Sonnet 챗봇) + Voyage/OpenAI Embedding
수집      RSS Parser (rss-parser) + node-cron / BullMQ scheduler
배포      Vercel (frontend) + Railway (backend + db + redis)
모니터링  Vercel Analytics + 백엔드 간단 로깅 (pino)
모노레포  pnpm workspace
```

## 8. 차별점 정리

| 영역 | 기존 | Pulse |
|---|---|---|
| RSS 리더 (Feedly) | 텍스트 그대로 / 정리 X | AI 한국어 요약 + 카테고리 분류 |
| 텍스트 다이제스트 메일 | 검색 X / 인터랙션 X | 챗봇 + 시각 대시보드 |
| ChatGPT *"오늘 뉴스"* | 내가 본 글 모름 / 한국 소스 약함 | 본 글 메모리 + 국내 블로그 1순위 |
| Refind / Sumly | 영문 위주 | 한국어 + 국내 블로그 통합 |
| HN/GeekNews 본문 | 한 사이트만 | 통합 + 자연어 쿼리 |

핵심 차별: **본 글 메모리 + 한국어 + 챗봇** 3개 결합. 셋 다 갖춘 도구 거의 없음.

## 9. V2+ 로드맵

- **V1.5**: 컨퍼런스 YouTube 자동 수집 + 발표 영상 트랜스크립트 RAG + 주제 알림
- **V2**: 밋업 자동 수집 (Festa.io 등) + 발표자 프로필 + 팀 워크스페이스
- **V2.5**: 소스 확장 (Reddit / X)
- **V3**: 글쓰기 보조 (*"이번 주 트렌드 기반 블로그 글 초안"*) + 토론 모드 (반대 의견)

## 10. 성공 지표

**본인 사용 우선.**
- 잭 본인이 매일 9시 다이제스트 진입 → 클릭/검색 행동 자동 발생
- 챗봇 자연어 쿼리 주 5회 이상
- 5주 안에 라이브 배포

**부가 지표 (있으면 좋음)**
- 친구/지인 10명 가입
- 깃허브 README + 데모 영상 첫인상 강함
- 면접 30초 데모 가능

## 11. 리스크 + 완화

| 리스크 | 완화 |
|---|---|
| RSS 못 잡는 소스 있음 | RSS 우선 / API 차선 / 못 잡는 곳은 V2 이후 |
| 본문 저작권 | 본문 전체 저장 X / 요약만 / 원문 링크 명시 |
| 챗봇 환각 (RAG가 잘못 답) | 답변에 출처 카드 필수 / Top-K 결과 함께 표시 |
| Claude API 비용 폭증 | Haiku 우선 / 캐싱 / 일일 사용자별 호출 cap |
| 매일 9시 cron 신뢰성 | BullMQ delayed job + 실패 재시도 + 슬랙/디스코드 알림 |
| 정보 과부하 도구가 또 다른 과부하 됨 | 다이제스트 카드 수 상한 (Top 20) + 안 본 글 우선 / 본 글 자동 dismiss |

## 12. 다음 액션

1. 잭이 이 PRD 검토 → OK 또는 수정 요청
2. monorepo 셋업 (Week 1) 시작
3. GitHub repo 생성 + 첫 커밋 + README 초안
