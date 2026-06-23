export interface RepoDto {
  id: string;
  fullName: string; // owner/repo
  owner: string;
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  periodStars: number; // 기간 내 증가 star (velocity)
  period: string; // "daily" | "weekly"
  category: string; // ai / web / infra / cli / data / etc
  rank: number;
}

// API 미연결 시 fallback (소량)
export const MOCK_REPOS: RepoDto[] = [
  {
    id: 'm1',
    fullName: 'chopratejas/headroom',
    owner: 'chopratejas',
    name: 'headroom',
    url: 'https://github.com/chopratejas/headroom',
    description:
      'Compress tool outputs, logs, files, and RAG chunks before they reach the LLM. 60-95% fewer tokens',
    language: 'Python',
    languageColor: '#3572A5',
    stars: 21831,
    forks: 1410,
    periodStars: 13062,
    period: 'weekly',
    category: 'ai',
    rank: 1,
  },
  {
    id: 'm2',
    fullName: 'lfnovo/open-notebook',
    owner: 'lfnovo',
    name: 'open-notebook',
    url: 'https://github.com/lfnovo/open-notebook',
    description: 'An Open Source implementation of Notebook LM with more flexibility and features',
    language: 'TypeScript',
    languageColor: '#3178c6',
    stars: 29002,
    forks: 3290,
    periodStars: 4648,
    period: 'weekly',
    category: 'ai',
    rank: 2,
  },
];
