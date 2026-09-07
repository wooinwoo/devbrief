// 글 태그를 6개 대분류로 매핑 + 색. "색으로 스캔" 가능하게.
export interface Category {
  key: string;
  label: string;
  color: string; // 텍스트/보더용 (진한)
  soft: string; // 칩 배경용 (연한)
}

export const CATEGORIES: Record<string, Category> = {
  ai: { key: 'ai', label: 'AI', color: '#b64825', soft: '#f9e8df' },
  frontend: {
    key: 'frontend',
    label: 'Frontend',
    color: 'oklch(52% 0.17 250)',
    soft: 'oklch(95% 0.035 250)',
  },
  backend: {
    key: 'backend',
    label: 'Backend',
    color: 'oklch(50% 0.15 155)',
    soft: 'oklch(94% 0.04 155)',
  },
  infra: { key: 'infra', label: 'Infra', color: 'oklch(56% 0.15 60)', soft: 'oklch(95% 0.05 70)' },
  data: { key: 'data', label: 'Data', color: 'oklch(54% 0.13 200)', soft: 'oklch(94% 0.04 200)' },
  mobile: {
    key: 'mobile',
    label: 'Mobile',
    color: '#796129',
    soft: '#f4efdf',
  },
  etc: { key: 'etc', label: '기타', color: '#65655d', soft: '#eeece5' },
};

// ASCII(latin/digit) 기준 단어 경계.
// 경계로 "ASCII letter/digit 가 아닌 곳"만 쓴다(한글은 경계로 친다). 두 목적을 동시에 만족:
//  - ASCII 오탐 방지: "java" in "javascript" → 뒤가 latin 이라 경계 불일치(미매칭).
//  - 한글 조사 허용: "AI를", "임베딩으로", "데이터 파이프라인" 처럼 키워드에 한글 조사/단어가
//    붙어도 매칭(제목 본문은 조사가 붙어 다님). \p{L} 경계였다면 한글 조사에 막혀 전부 미매칭.
const WB_BEFORE = '(?<![A-Za-z0-9])';
const WB_AFTER = '(?![A-Za-z0-9])';

const bounded = (alternation: string): RegExp =>
  new RegExp(`${WB_BEFORE}(?:${alternation})${WB_AFTER}`, 'iu');

// 명백한 AI/LLM 신호. 제목/요약에 이게 있으면 다른 카테고리보다 우선한다.
// (광범위한 ai/agent/model 류는 여기 두지 않는다 — 다른 주제 글까지 ai 로 빨아들이지 않게.
//  예: "React 19 출시"의 "ai" 우연 매칭 < frontend 가 되도록, 약한 ai 는 TAG_MAP 맨 끝.)
// "ChatGPT" 같은 복합 브랜드는 내부 "gpt" 앞이 latin 이라 경계에 막힌다 — chat.?gpt 로 따로 잡는다.
const STRONG_AI = bounded(
  'claude|gpt|chat.?gpt|codex|anthropic|openai|gemini|deepmind|glm|llama|qwen|deepseek|mistral|gemma|grok|llm|인공지능|딥러닝|머신러닝|machine.?learning|transformer|diffusion|rag|mcp|fine.?tun|sota|leaderboard',
);

// 키워드 → 카테고리. 제목 기반이 되면 오매칭 위험이 커져 순서가 중요하다.
// 더 구체적인 카테고리를 먼저: mobile → frontend → backend → data → infra → ai(광범위).
// 한국 기술블로그(토스·카카오 등)는 음차 표기를 즐겨 쓰므로 영문 키워드마다 음차어를 병기한다.
// "go" 단독은 일반 영단어 오탐이 커서 버전 결합("Go 1.24")일 때만 매칭.
const TAG_MAP: Array<[RegExp, string]> = [
  [
    bounded(
      'mobile|ios|android|swift|swiftui|flutter|react.?native|imessage|모바일|안드로이드|아이폰',
    ),
    'mobile',
  ],
  [
    bounded(
      'frontend|react|vue|svelte|next\\.?js|html|css|tailwind|webdev|ui|ux|rsc|javascript|typescript|browser|웹|리액트|프론트엔드',
    ),
    'frontend',
  ],
  [
    bounded(
      'backend|server|api|rest|grpc|microservice|마이크로서비스|nest|spring|node|golang|go(?=\\s*1\\.[0-9])|rust|java|kotlin|php|wordpress|db|database|postgres|sql|아키텍처|서버|백엔드|스프링|코틀린',
    ),
    'backend',
  ],
  [
    bounded(
      'data|dataengineering|analytics|bigdata|spark|kafka|etl|vector|embedding|임베딩|dataset|pipeline|파이프라인|데이터|분석',
    ),
    'data',
  ],
  [
    bounded(
      'infra|devops|kubernetes|k8s|docker|cloud|aws|gcp|terraform|ci|cd|cluster|클러스터|rdma|gpu|vllm|self.?host|observability|nginx|ssh|dns|인프라|클라우드|운영|쿠버네티스|도커',
    ),
    'infra',
  ],
  // "모델" 단독은 "비즈니스 모델" 류 일반어 오탐이 커서 합성어로 한정한다
  // (ai-topics.ts 의 AI_HINT 와 같은 어휘로 유지할 것 — 판정기 간 계약).
  [
    bounded(
      'ai|ml|에이전트|agent|harness|benchmark|eval|언어 모델|파운데이션 모델|오픈소스 모델|model|추론|inference',
    ),
    'ai',
  ],
];

/** categoryOf 가 분류에 쓰는 글의 부분집합 */
export interface CategorizableArticle {
  title: string;
  titleKo?: string | null;
  summaryOneLine?: string | null;
  tags: string[];
}

/**
 * 글(제목·번역제목·한 줄 요약·태그)을 보고 대표 카테고리 1개를 판정.
 *
 * 과거엔 태그 배열만 봤으나, 실제 글의 약 2/3가 RSS 태그가 없어 전부 "기타"로 떨어졌다.
 * 이제 제목/요약까지 합친 haystack 으로 매칭해 태그가 없어도 분류된다.
 */
export function categoryOf(article: CategorizableArticle): Category {
  const haystack = [
    article.title,
    article.titleKo ?? '',
    article.summaryOneLine ?? '',
    article.tags.join(' '),
  ].join(' ');

  if (STRONG_AI.test(haystack)) return CATEGORIES.ai;

  for (const [re, key] of TAG_MAP) {
    if (re.test(haystack)) return CATEGORIES[key];
  }
  return CATEGORIES.etc;
}
