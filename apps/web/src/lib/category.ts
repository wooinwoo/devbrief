// 글 태그를 6개 대분류로 매핑 + 색. "색으로 스캔" 가능하게.
export interface Category {
  key: string;
  label: string;
  color: string; // 텍스트/보더용 (진한)
  soft: string; // 칩 배경용 (연한)
}

export const CATEGORIES: Record<string, Category> = {
  ai: { key: 'ai', label: 'AI', color: 'oklch(50% 0.19 265)', soft: 'oklch(95% 0.035 265)' },
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
    color: 'oklch(56% 0.18 350)',
    soft: 'oklch(95% 0.04 350)',
  },
  etc: { key: 'etc', label: '기타', color: 'oklch(55% 0.02 285)', soft: 'oklch(94% 0.008 285)' },
};

// 유니코드 인식 단어 경계.
// JS의 `\b`는 ASCII(`\w`) 기준이라 한글 앞뒤를 단어 경계로 보지 못해
// 한글 키워드("백엔드" 등)가 전혀 매칭되지 않는다.
// 대신 letter/number(한글 포함 \p{L}\p{N}) 가 아닌 곳을 경계로 삼는 lookbehind/lookahead를 쓴다.
// - ASCII 오탐 방지 유지: "java" in "javascript" → 뒤가 letter라 경계 불일치(미매칭).
// - 한글 매칭: "백엔드" 단독/구두점·공백 경계에서 매칭.
const WB_BEFORE = '(?<![\\p{L}\\p{N}])';
const WB_AFTER = '(?![\\p{L}\\p{N}])';

const bounded = (alternation: string): RegExp =>
  new RegExp(`${WB_BEFORE}(?:${alternation})${WB_AFTER}`, 'iu');

// 태그 키워드 → 카테고리
const TAG_MAP: Array<[RegExp, string]> = [
  [
    bounded(
      'ai|llm|gpt|codex|claude|anthropic|openai|gemini|deepmind|glm|llama|qwen|deepseek|mistral|gemma|phi|grok|ml|machine.?learning|딥러닝|머신러닝|에이전트|agent|harness|benchmark|eval|sota|leaderboard|rag|mcp|vllm|vector|embedding|임베딩|모델|추론|inference|fine.?tun|transformer|diffusion',
    ),
    'ai',
  ],
  [
    bounded(
      'frontend|react|vue|svelte|next|css|tailwind|webdev|ui|ux|rsc|javascript|typescript|browser|웹',
    ),
    'frontend',
  ],
  [
    bounded(
      'backend|server|api|nest|spring|node|go|rust|java|kotlin|db|database|postgres|sql|아키텍처|서버|백엔드',
    ),
    'backend',
  ],
  [
    bounded(
      'infra|devops|kubernetes|k8s|docker|cloud|aws|gcp|terraform|ci|cd|observability|인프라|클라우드|운영',
    ),
    'infra',
  ],
  [bounded('data|dataengineering|analytics|bigdata|spark|kafka|etl|데이터|분석'), 'data'],
  [bounded('mobile|ios|android|swift|flutter|reactnative|모바일'), 'mobile'],
];

/** 글 태그 배열 → 대표 카테고리 1개 */
export function categoryOf(tags: string[]): Category {
  for (const tag of tags) {
    for (const [re, key] of TAG_MAP) {
      if (re.test(tag)) return CATEGORIES[key];
    }
  }
  return CATEGORIES.etc;
}
