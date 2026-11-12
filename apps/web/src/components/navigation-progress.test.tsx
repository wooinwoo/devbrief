import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let currentPath = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
  useSearchParams: () => new URLSearchParams(),
}));

import { NavigationProgress } from './navigation-progress';

function clickLink(href: string, init: MouseEventInit = {}, attrs: Record<string, string> = {}) {
  const a = document.createElement('a');
  a.href = href;
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  a.addEventListener('click', (e) => e.preventDefault());
  document.body.appendChild(a);
  act(() => {
    a.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }),
    );
  });
  a.remove();
}

describe('NavigationProgress', () => {
  afterEach(() => {
    cleanup();
    currentPath = '/';
  });

  it('사이트 안 링크를 누르면 막대를 보이고, 주소가 바뀌면 숨긴다', () => {
    const view = render(<NavigationProgress />);
    clickLink('/articles/a1');
    expect(document.querySelector('.nav-progress')).not.toBeNull();

    currentPath = '/articles/a1';
    view.rerender(<NavigationProgress />);
    expect(document.querySelector('.nav-progress')).toBeNull();
  });

  it('외부 주소·새 창·수정 키·같은 화면 링크에는 막대를 보이지 않는다', () => {
    render(<NavigationProgress />);
    clickLink('https://example.com/post');
    clickLink('/articles/a1', {}, { target: '_blank' });
    clickLink('/articles/a1', { metaKey: true });
    clickLink('/');
    clickLink('/#top');
    clickLink('/files/report.pdf', {}, { download: '' });
    expect(document.querySelector('.nav-progress')).toBeNull();
  });

  it('뒤로 가기 캐시에서 돌아온 페이지에서는 막대를 끈다', () => {
    render(<NavigationProgress />);
    clickLink('/articles/a1');
    expect(document.querySelector('.nav-progress')).not.toBeNull();
    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    expect(document.querySelector('.nav-progress')).toBeNull();
  });
});
