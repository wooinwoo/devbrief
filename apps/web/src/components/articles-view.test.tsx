import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// next/navigation 모킹 — 탭은 URL 쿼리에서 파생되므로 router.replace 와 searchParams 를 제어한다.
const replace = vi.fn();
let currentTab: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({ get: (k: string) => (k === 'tab' ? currentTab : null) }),
}));

import { ArticlesView } from './articles-view';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  replace.mockClear();
  currentTab = null;
});

describe('ArticlesView 탭 키보드 접근성', () => {
  it('탭은 role=tablist / role=tab 으로 노출되고 활성 탭만 aria-selected', () => {
    const { getByRole, getAllByRole } = render(<ArticlesView articles={[]} />);
    expect(getByRole('tablist')).toBeTruthy();
    const tabs = getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(1);
    const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toBe('오늘');
  });

  it('roving tabindex — 활성 탭만 tabIndex 0, 나머지는 -1', () => {
    const { getAllByRole } = render(<ArticlesView articles={[]} />);
    const tabs = getAllByRole('tab');
    const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    const inactive = tabs.filter((t) => t.getAttribute('aria-selected') !== 'true');
    expect(active?.getAttribute('tabindex')).toBe('0');
    expect(inactive.every((t) => t.getAttribute('tabindex') === '-1')).toBe(true);
  });

  it('ArrowRight 로 다음 탭으로 이동(router.replace 호출)', () => {
    const { getAllByRole } = render(<ArticlesView articles={[]} />);
    const tabs = getAllByRole('tab');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    // 두 번째 탭은 'ai' → /?tab=ai
    expect(replace).toHaveBeenCalledWith('/?tab=ai', { scroll: true });
  });

  it('ArrowLeft 는 첫 탭에서 마지막 탭으로 순환', () => {
    const { getAllByRole } = render(<ArticlesView articles={[]} />);
    const tabs = getAllByRole('tab');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    // 마지막 탭은 'repos'
    expect(replace).toHaveBeenCalledWith('/?tab=repos', { scroll: true });
  });

  it('콘텐츠 영역은 role=tabpanel 로 활성 탭과 연결된다', () => {
    const { getByRole } = render(<ArticlesView articles={[]} />);
    const panel = getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe('tab-all');
  });
});
