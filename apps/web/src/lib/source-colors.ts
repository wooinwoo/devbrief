// 소스별 식별 색(dot) — 단일 출처. 여러 컴포넌트가 import 해서 일관 유지.
export const SOURCE_DOT: Record<string, string> = {
  geeknews: 'oklch(55% 0.16 160)',
  hackernews: 'oklch(62% 0.18 45)',
  devto: 'oklch(58% 0.18 290)',
  techcrunch: 'oklch(58% 0.21 15)',
  anthropic: 'oklch(62% 0.17 60)',
  openai: 'oklch(52% 0.13 165)',
  producthunt: 'oklch(58% 0.20 340)',
  kakao_tech: 'oklch(72% 0.16 90)',
  toss_tech: 'oklch(58% 0.18 250)',
  woowahan: 'oklch(64% 0.17 150)',
  naver_d2: 'oklch(58% 0.18 145)',
  huggingface: 'oklch(64% 0.16 70)',
  deepmind: 'oklch(54% 0.17 250)',
  simonwillison: 'oklch(56% 0.1 285)',
  latentspace: 'oklch(56% 0.16 320)',
  importai: 'oklch(54% 0.13 200)',
  // FE/웹 거물 블로그
  overreacted: 'oklch(60% 0.18 25)',
  josh_comeau: 'oklch(58% 0.17 320)',
  kent_dodds: 'oklch(56% 0.16 265)',
  isquared: 'oklch(58% 0.17 280)',
  ben_myers: 'oklch(60% 0.16 130)',
  css_tricks: 'oklch(60% 0.19 40)',
  smashing: 'oklch(62% 0.2 30)',
  web_dev: 'oklch(56% 0.16 255)',
  v8_dev: 'oklch(58% 0.17 250)',
  mdn: 'oklch(52% 0.1 270)',
  pragmatic: 'oklch(54% 0.12 230)',
  rss_generic: 'oklch(56% 0.02 290)',
};

export const sourceColor = (provider: string): string =>
  SOURCE_DOT[provider] ?? SOURCE_DOT.rss_generic;
