/**
 * @devbrief/shared — API 와이어 계약의 단일 소스.
 *
 * 모든 DTO 는 "JSON 직렬화 후" 형태다: Prisma DateTime 은 ISO 8601 string,
 * nullable 컬럼은 `| null`. apps/api 컨트롤러의 실제 select/include 와 1:1 로 유지하며,
 * api 쪽 계약 브리지(`Wire` + `Equals`)가 어긋남을 컴파일 타임에 잡는다 (감사 c58).
 */

// ── 계약 브리지 헬퍼 ─────────────────────────────────────────────────────────

/** DB row(직렬화 전) → JSON 와이어 형태. Date 는 ISO 8601 string 이 된다. */
export type Wire<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Wire<U>[]
    : T extends object
      ? { [K in keyof T]: Wire<T[K]> }
      : T;

/** 두 타입이 정확히 같을 때만 true — satisfies 로는 못 잡는 초과/누락 필드까지 잡는다. */
export type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

/** `type _check = Expect<Equals<A, B>>` 꼴로 사용 — 불일치면 그 자리에서 컴파일 에러. */
export type Expect<T extends true> = T;

// ── Articles ────────────────────────────────────────────────────────────────

/** GET /articles/batch 가 한 번에 받는 id 최대 개수(중복 제거 후 기준). 초과분은 잘린다. */
export const BATCH_MAX_IDS = 100;

/**
 * GET /articles 목록의 전체 건수(동일 where 의 count)가 내려오는 응답 헤더.
 * 본문은 하위호환을 위해 배열 그대로다 — 페이지네이션은 이 헤더 + offset 쿼리로 (감사 c62).
 */
export const TOTAL_COUNT_HEADER = 'X-Total-Count';

/** 목록/배치/related 에 내려가는 source 요약 — name/provider 만 노출 */
export interface ArticleSourceRef {
  name: string;
  provider: string;
}

/**
 * GET /articles · GET /articles/batch · GET /articles/:id/related 아이템.
 * contentSnippet/contentHtml/author/fetchedAt 은 목록 계열에 내려가지 않는다
 * (본문은 상세 GET /articles/:id 에서만 — 페이로드 누수 방지 화이트리스트).
 */
export interface ArticleListItem {
  id: string;
  title: string;
  /** 영문 글이면 한국어 자동 번역, 한국어 글이면 null */
  titleKo: string | null;
  url: string;
  summaryOneLine: string | null;
  summaryThreeLine: string | null;
  publishedAt: string;
  tags: string[];
  imageUrl: string | null;
  /** 'ko' | 'en' | 'mixed' — DB 컬럼이 자유 string 이라 union 으로 좁히지 않는다 */
  language: string;
  source: ArticleSourceRef;
}

/** GET /articles/:id — Article 전 컬럼(embedding 제외) + source 전체 행 */
export interface ArticleDetail {
  id: string;
  sourceId: string;
  title: string;
  titleKo: string | null;
  url: string;
  author: string | null;
  publishedAt: string;
  summaryOneLine: string | null;
  summaryThreeLine: string | null;
  /** 'gemini' | 'free' — free 는 키 복구 후 백필 대상 */
  summarySource: string | null;
  /** 요약 재생성용 본문 평문 발췌 (수집 시 저장) */
  contentSnippet: string | null;
  /** 정제(sanitize)된 본문 HTML — 상세 페이지 직접 읽기용 */
  contentHtml: string | null;
  tags: string[];
  language: string;
  fetchedAt: string;
  imageUrl: string | null;
  /** 상세는 include: { source: true } — 공개 select 와 달리 lastError 까지 내려간다 */
  source: SourceRecord;
}

// ── Sources ─────────────────────────────────────────────────────────────────

/** GET /sources 아이템 — 비인증 공개 select. lastError(내부 에러 원문)는 제외된다. */
export interface SourcePublic {
  id: string;
  provider: string;
  name: string;
  feedUrl: string;
  homepage: string | null;
  /** ko / en / mixed */
  language: string;
  active: boolean;
  createdAt: string;
  /** 마지막 수집 성공 시각 — 죽은 피드 감지용 */
  lastFetchedAt: string | null;
}

/** Source 전체 행 — 글 상세(include: source)처럼 전 컬럼이 내려가는 응답 전용 */
export interface SourceRecord extends SourcePublic {
  /** 마지막 수집 실패 사유 (성공 시 null) */
  lastError: string | null;
}

// ── Conferences ─────────────────────────────────────────────────────────────

/** ACTIVE=노출 / PROPOSED=자동 발견 후보(운영자 검토 대기) / REJECTED=반려 */
export type ConferenceStatus = 'ACTIVE' | 'PROPOSED' | 'REJECTED';

/** GET /conferences 아이템 — Conference 전체 행 (startDate 오름차순) */
export interface ConferenceDto {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate: string | null;
  location: string;
  topics: string[];
  description: string | null;
  imageUrl: string | null;
  /** oklch / hex — 브랜드 컬러 */
  brandColor: string | null;
  youtubeChannelId: string | null;
  /** DB 컬럼은 string — 쓰는 쪽(시더/디스커버리/승인)이 이 3값만 기록한다 */
  status: ConferenceStatus;
  discoveredFromArticleId: string | null;
  discoveredAt: string | null;
  createdAt: string;
}

// ── Videos ──────────────────────────────────────────────────────────────────

/** Video.chapters 원소 — time 은 초 단위 오프셋 */
export interface VideoChapter {
  time: number;
  label: string;
}

/** official=youtubei chapters / description=본문 타임스탬프 파싱 / ai=Gemini 자동 생성 */
export type VideoChapterSource = 'official' | 'description' | 'ai';

/** GET /videos · GET /videos/:id — Video 전체 행 + conference(name/brandColor) */
export interface VideoDto {
  id: string;
  /** YouTube video id */
  videoId: string;
  title: string;
  url: string;
  /** 채널명 표시용 */
  channel: string;
  thumbnailUrl: string;
  durationSec: number;
  views: number;
  publishedAt: string;
  topics: string[];
  /** YouTube snippet.description (chapters 파싱 소스) */
  description: string | null;
  chapters: VideoChapter[] | null;
  chapterSource: VideoChapterSource | null;
  /** Gemini 3줄 요약 */
  summary: string | null;
  analyzedAt: string | null;
  conferenceId: string | null;
  conference: { name: string; brandColor: string | null } | null;
  fetchedAt: string;
}

// ── Repos ───────────────────────────────────────────────────────────────────

export type RepoPeriod = 'daily' | 'weekly';

/** repos.service categorize() 가 기록하는 값 전체 */
export type RepoCategory = 'ai' | 'web' | 'infra' | 'cli' | 'data' | 'etc';

/** GET /repos 아이템 — Repo 전체 행 (rank 오름차순) */
export interface RepoDto {
  id: string;
  /** owner/repo */
  fullName: string;
  owner: string;
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  /** 기간 내 증가 star (= velocity 지표) */
  periodStars: number;
  period: RepoPeriod;
  category: RepoCategory;
  /** 트렌딩 순위 (작을수록 상위) */
  rank: number;
  fetchedAt: string;
}

// ── Digest ──────────────────────────────────────────────────────────────────

/** DailyDigest.items 원소 — 그 날 핵심 글 하나 */
export interface DigestItem {
  articleId: string;
  headline: string;
  takeaway: string;
}

/**
 * GET /digest/today — DailyDigest 전체 행. 그 날 다이제스트가 없으면 본문이
 * JSON `null` 이다 (빈 본문 아님 — api 가 명시적으로 문자열 직렬화해 보장).
 */
export interface DailyDigestDto {
  id: string;
  /** KST 자정 경계의 UTC 순간 */
  date: string;
  items: DigestItem[];
  /** 그 날 전반의 한 줄 요약 */
  intro: string | null;
  generatedAt: string;
}

// ── Stats ───────────────────────────────────────────────────────────────────

/** 소스별 글 수 (상위 N) */
export interface SourceCount {
  sourceId: string;
  name: string;
  count: number;
}

/** 일자별(KST 달력, yyyy-mm-dd) 수집 글 수 — 0건인 날도 채워져 내려온다 */
export interface DailyCount {
  date: string;
  count: number;
}

/** GET /stats/collection — 어드민 대시보드 수집 통계 집계 */
export interface CollectionStats {
  articles: {
    total: number;
    summarized: number;
    unsummarized: number;
    embedded: number;
  };
  topSources: SourceCount[];
  recentDaily: DailyCount[];
  conferences: number;
  videos: number;
  repos: number;
}
