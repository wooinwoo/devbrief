// 글 태그를 6개 대분류로 매핑 + 색. "색으로 스캔" 가능하게.
export interface Category {
  key: string;
  label: string;
  color: string; // 텍스트/보더용 (진한)
  soft: string; // 칩 배경용 (연한)
}

export const CATEGORIES: Record<string, Category> = {
  ai: { key: 'ai', label: 'AI', color: 'oklch(50% 0.19 265)', soft: 'oklch(95% 0.035 265)' },
  frontend: { key: 'frontend', label: 'Frontend', color: 'oklch(52% 0.17 250)', soft: 'oklch(95% 0.035 250)' },
  backend: { key: 'backend', label: 'Backend', color: 'oklch(50% 0.15 155)', soft: 'oklch(94% 0.04 155)' },
  infra: { key: 'infra', label: 'Infra', color: 'oklch(56% 0.15 60)', soft: 'oklch(95% 0.05 70)' },
  data: { key: 'data', label: 'Data', color: 'oklch(54% 0.13 200)', soft: 'oklch(94% 0.04 200)' },
  mobile: { key: 'mobile', label: 'Mobile', color: 'oklch(56% 0.18 350)', soft: 'oklch(95% 0.04 350)' },
  etc: { key: 'etc', label: '기타', color: 'oklch(55% 0.02 285)', soft: 'oklch(94% 0.008 285)' },
};

// 태그 키워드 → 카테고리
const TAG_MAP: Array<[RegExp, string]> = [
  [/\b(ai|llm|gpt|codex|claude|anthropic|openai|gemini|deepmind|glm|llama|qwen|deepseek|mistral|gemma|phi|grok|ml|machine.?learning|딥러닝|머신러닝|에이전트|agent|harness|benchmark|eval|sota|leaderboard|rag|mcp|vllm|vector|embedding|임베딩|모델|추론|inference|fine.?tun|transformer|diffusion)\b/i, 'ai'],
  [/\b(frontend|react|vue|svelte|next|css|tailwind|webdev|ui|ux|rsc|javascript|typescript|browser|웹)\b/i, 'frontend'],
  [/\b(backend|server|api|nest|spring|node|go|rust|java|kotlin|db|database|postgres|sql|아키텍처|서버|백엔드)\b/i, 'backend'],
  [/\b(infra|devops|kubernetes|k8s|docker|cloud|aws|gcp|terraform|ci|cd|observability|인프라|클라우드|운영)\b/i, 'infra'],
  [/\b(data|dataengineering|analytics|bigdata|spark|kafka|etl|데이터|분석)\b/i, 'data'],
  [/\b(mobile|ios|android|swift|flutter|reactnative|모바일)\b/i, 'mobile'],
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
