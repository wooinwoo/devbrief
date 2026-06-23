// AI 트렌드 레이더 — 글을 '모델 / 하네스(도구) / 주제' 3축으로 분류.
// "Claude 쓰는 사람은 Claude·Claude Code 소식만" 골라볼 수 있게.
import type { ArticleDto } from '@/components/article-card';

export interface AiFacet {
  key: string;
  label: string;
  color: string;
  re: RegExp;
}

// 1) 모델 / 벤더 — 유명 LLM 개별
export const AI_MODELS: AiFacet[] = [
  { key: 'claude', label: 'Claude', color: 'oklch(58% 0.16 60)', re: /\b(claude|anthropic|sonnet|opus|haiku)\b/i },
  { key: 'gpt', label: 'GPT', color: 'oklch(52% 0.13 165)', re: /\b(gpt-?[0-9o]|chatgpt|openai|\bo[1-4]\b|dall.?e|sora)\b/i },
  { key: 'gemini', label: 'Gemini', color: 'oklch(54% 0.17 250)', re: /\b(gemini|gemma|deepmind)\b/i },
  { key: 'llama', label: 'Llama', color: 'oklch(56% 0.16 30)', re: /\b(llama|meta ai)\b/i },
  { key: 'qwen', label: 'Qwen', color: 'oklch(58% 0.18 320)', re: /\b(qwen|alibaba)\b/i },
  { key: 'deepseek', label: 'DeepSeek', color: 'oklch(52% 0.16 265)', re: /\bdeepseek\b/i },
  { key: 'mistral', label: 'Mistral', color: 'oklch(58% 0.17 45)', re: /\b(mistral|mixtral)\b/i },
  { key: 'glm', label: 'GLM', color: 'oklch(54% 0.15 145)', re: /\b(glm|zhipu|z\.ai)\b/i },
  { key: 'grok', label: 'Grok', color: 'oklch(48% 0.04 280)', re: /\b(grok|xai)\b/i },
];

// 2) 하네스 / 코딩 도구 — 각광받는 에이전트 하네스
export const AI_HARNESSES: AiFacet[] = [
  { key: 'claudecode', label: 'Claude Code', color: 'oklch(58% 0.16 60)', re: /\bclaude.?code\b/i },
  { key: 'codex', label: 'Codex', color: 'oklch(52% 0.13 165)', re: /\bcodex\b/i },
  { key: 'cursor', label: 'Cursor', color: 'oklch(50% 0.02 280)', re: /\bcursor\b/i },
  { key: 'copilot', label: 'Copilot', color: 'oklch(54% 0.15 230)', re: /\b(copilot|github copilot)\b/i },
  { key: 'aider', label: 'Aider', color: 'oklch(56% 0.16 150)', re: /\baider\b/i },
  { key: 'cline', label: 'Cline·Roo', color: 'oklch(56% 0.14 190)', re: /\b(cline|roo.?code)\b/i },
  { key: 'windsurf', label: 'Windsurf', color: 'oklch(56% 0.15 200)', re: /\b(windsurf|codeium)\b/i },
  { key: 'devin', label: 'Devin', color: 'oklch(52% 0.16 300)', re: /\bdevin\b/i },
  { key: 'gemini-cli', label: 'Gemini CLI', color: 'oklch(54% 0.17 250)', re: /\bgemini.?cli\b/i },
];

// 3) 주제
export const AI_THEMES: AiFacet[] = [
  { key: 'release', label: '모델 릴리스', color: 'oklch(56% 0.18 350)', re: /\b(release|launch|announc|unveil|introduc|now available)\b|출시|공개|발표/i },
  { key: 'agent', label: '에이전트·하네스', color: 'oklch(50% 0.19 265)', re: /\b(agent|agentic|harness|tool.?use|mcp|orchestrat|autonomous)\b|에이전트|하네스|오케스트레이/i },
  { key: 'bench', label: '벤치마크', color: 'oklch(54% 0.13 200)', re: /\b(benchmark|\beval\b|evaluation|sota|leaderboard|arena|mmlu|swe.?bench|gpqa|humaneval)\b|평가|벤치/i },
  { key: 'research', label: '연구·논문', color: 'oklch(50% 0.1 285)', re: /\b(paper|research|arxiv|reasoning|rlhf|distill|fine.?tun|pretrain)\b|논문|연구/i },
];

const AI_HINT =
  /\b(ai|a\.i\.|llm|gpt|codex|claude|anthropic|openai|gemini|deepmind|gemma|llama|qwen|deepseek|mistral|glm|grok|cursor|copilot|aider|cline|windsurf|devin|agent|harness|benchmark|\beval\b|rag|mcp|inference|transformer|diffusion|prompt|fine.?tun|embedding|vllm)\b|에이전트|하네스|모델|추론|임베딩/i;

// 이 소스들은 글 전체가 AI 주제
const AI_SOURCES = [
  'openai', 'deepmind', 'huggingface', 'simonwillison', 'latentspace', 'importai', 'anthropic',
];

function haystack(a: ArticleDto): string {
  return `${a.title} ${a.titleKo ?? ''} ${a.summaryOneLine ?? ''} ${a.tags.join(' ')}`;
}

export function isAiArticle(a: ArticleDto): boolean {
  if (AI_SOURCES.includes(a.source.provider)) return true;
  if (a.tags.some((t) => ['ai', 'llm'].includes(t.toLowerCase()))) return true;
  return AI_HINT.test(haystack(a));
}

function matchFacets(a: ArticleDto, facets: AiFacet[]): AiFacet[] {
  const hay = haystack(a);
  return facets.filter((f) => f.re.test(hay));
}

export const modelsOf = (a: ArticleDto) => matchFacets(a, AI_MODELS);
export const harnessesOf = (a: ArticleDto) => matchFacets(a, AI_HARNESSES);
export const themesOf = (a: ArticleDto) => matchFacets(a, AI_THEMES);
