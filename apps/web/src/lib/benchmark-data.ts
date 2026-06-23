// LLM 벤치마크 스냅샷 — 출처: Artificial Analysis (artificialanalysis.ai/leaderboards/models)
// 2026-06 시점 수치. 자동 갱신 전환 시: 서버 라우트(/api/benchmarks)가 이 정적값을 대체.
export interface BenchModel {
  name: string;
  vendor: 'claude' | 'gpt' | 'gemini' | 'open';
  intelligence: number; // Artificial Analysis Intelligence Index
  speed: number | null; // output tokens/s
  price: number | null; // USD / 1M tokens (blended)
  coding: number | null; // SWE-bench Verified (% resolved)
}

export const BENCHMARK_SOURCE = {
  name: 'Artificial Analysis',
  url: 'https://artificialanalysis.ai/leaderboards/models',
  updatedAt: '2026-06 스냅샷',
};

export const BENCHMARK_MODELS: BenchModel[] = [
  {
    name: 'Claude Opus 4.8',
    vendor: 'claude',
    intelligence: 61,
    speed: 64,
    price: 4.1,
    coding: 88.6,
  },
  { name: 'GPT-5.5', vendor: 'gpt', intelligence: 59, speed: 70, price: 4.35, coding: 85.0 },
  {
    name: 'Claude Opus 4.7',
    vendor: 'claude',
    intelligence: 57,
    speed: 50,
    price: 4.1,
    coding: 87.6,
  },
  {
    name: 'Gemini 3.1 Pro',
    vendor: 'gemini',
    intelligence: 57,
    speed: 138,
    price: 1.74,
    coding: 80.6,
  },
  { name: 'Qwen3.7 Max', vendor: 'open', intelligence: 57, speed: 167, price: 1.43, coding: null },
  {
    name: 'Gemini 3.5 Flash',
    vendor: 'gemini',
    intelligence: 55,
    speed: 187,
    price: 1.31,
    coding: null,
  },
  { name: 'MiniMax-M3', vendor: 'open', intelligence: 55, speed: null, price: null, coding: null },
  { name: 'Kimi K2.6', vendor: 'open', intelligence: 54, speed: 44, price: 0.7, coding: null },
  { name: 'MiMo-V2.5-Pro', vendor: 'open', intelligence: 54, speed: 43, price: 0.18, coding: null },
];

const VENDOR_COLOR: Record<BenchModel['vendor'], string> = {
  claude: 'oklch(58% 0.16 60)',
  gpt: 'oklch(52% 0.13 165)',
  gemini: 'oklch(54% 0.17 250)',
  open: 'oklch(50% 0.15 155)',
};
const VENDOR_LABEL: Record<BenchModel['vendor'], string> = {
  claude: 'Anthropic',
  gpt: 'OpenAI',
  gemini: 'Google',
  open: '오픈모델',
};

export const vendorColor = (v: BenchModel['vendor']) => VENDOR_COLOR[v];
export const vendorLabel = (v: BenchModel['vendor']) => VENDOR_LABEL[v];
