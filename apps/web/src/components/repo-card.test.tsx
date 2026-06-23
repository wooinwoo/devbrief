import type { RepoDto } from '@/lib/mock-repos';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RepoCard } from './repo-card';

afterEach(cleanup);

const REPO: RepoDto = {
  id: 'r1',
  fullName: 'vercel/next.js',
  owner: 'vercel',
  name: 'next.js',
  url: 'https://github.com/vercel/next.js',
  description: 'The React Framework',
  language: 'TypeScript',
  languageColor: '#3178c6',
  stars: 12500,
  forks: 2400,
  periodStars: 320,
  period: 'weekly',
  category: 'web',
  rank: 1,
};

describe('RepoCard', () => {
  it('owner/repo, 언어, 분야 라벨을 렌더한다', () => {
    const { getByText } = render(<RepoCard repo={REPO} />);
    expect(getByText('vercel/')).toBeTruthy();
    expect(getByText('next.js')).toBeTruthy();
    expect(getByText('TypeScript')).toBeTruthy();
    expect(getByText('웹')).toBeTruthy(); // category 'web' → '웹'
  });

  it('큰 수치는 k 단위로 축약한다 (12500 → 13k, 2400 → 2.4k)', () => {
    const { container, getByText } = render(<RepoCard repo={REPO} />);
    // 12500 / 1000 = 12.5 → toFixed(0) = 13 → 13k
    expect(container.textContent).toContain('13k');
    // 2400 / 1000 = 2.4 → toFixed(1) = 2.4 → 2.4k
    expect(getByText(/포크 2\.4k/)).toBeTruthy();
  });

  it('weekly 기간은 "이번 주" 라벨, velocity 를 +증가량으로 표시', () => {
    const { container, getByText } = render(<RepoCard repo={REPO} />);
    expect(getByText(/이번 주/)).toBeTruthy();
    expect(container.textContent).toContain('+320');
  });

  it('daily 기간은 "오늘" 라벨', () => {
    const { getByText } = render(<RepoCard repo={{ ...REPO, period: 'daily' }} />);
    expect(getByText(/오늘/)).toBeTruthy();
  });

  it('외부 링크는 새 탭 + rel="noopener noreferrer" + aria-label 제공', () => {
    const { container } = render(<RepoCard repo={REPO} />);
    const a = container.querySelector('a') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe(REPO.url);
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('aria-label')).toContain('vercel/next.js');
  });

  it('알 수 없는 category 는 "기타" 로 폴백', () => {
    const { getByText } = render(<RepoCard repo={{ ...REPO, category: 'unknown' }} />);
    expect(getByText('기타')).toBeTruthy();
  });

  it('language 가 null 이면 언어 dot/라벨을 렌더하지 않는다', () => {
    const { queryByText } = render(
      <RepoCard repo={{ ...REPO, language: null, languageColor: null }} />,
    );
    expect(queryByText('TypeScript')).toBeNull();
  });
});
