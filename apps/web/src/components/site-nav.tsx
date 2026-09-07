'use client';

import { useVisibleNavigation } from '@/lib/use-visible-navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GlobalSearch } from './global-search';
import { LangToggle } from './lang-toggle';

const TABS = [
  { href: '/?tab=all', label: '오늘' },
  { href: '/?tab=ai', label: 'AI' },
  { href: '/?tab=articles', label: '개발 뉴스' },
  { href: '/?tab=conferences', label: '행사' },
  { href: '/?tab=videos', label: '발표 영상' },
  { href: '/?tab=repos', label: '오픈소스' },
  { href: '/bookmarks', label: '저장' },
];

/** 글/영상 상세 상단 네비 — 메인 헤더와 동일한 비주얼 언어. */
export function SiteNav() {
  const pathname = usePathname();
  useVisibleNavigation(pathname);
  return (
    <nav
      aria-label="콘텐츠 탐색"
      className="brief-header sticky top-0 z-30 mb-9 mx-[calc(50%-50vw)] border-b [&_:focus-visible]:outline-(--bar-accent)"
      style={{ borderColor: 'var(--bar-line)', background: 'var(--bar-bg)' }}
    >
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 grid grid-cols-[1fr_auto] lg:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-6 lg:gap-x-8">
        <Link
          href="/"
          aria-label="Devbrief 홈"
          className="wordmark min-h-[60px] lg:min-h-[72px] shrink-0"
          style={{ color: 'var(--bar-fg)', fontWeight: 800 }}
        >
          devbrief<span>.</span>
        </Link>
        <div className="no-scrollbar order-3 col-span-2 lg:order-none lg:col-span-1 flex min-w-0 items-center gap-1 overflow-x-auto pb-2 lg:py-0">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={pathname === t.href ? 'page' : undefined}
              className="shrink-0 inline-flex items-center min-h-11 px-3 sm:px-3.5 py-2 rounded-sm text-[14px] sm:text-[14.5px] tracking-[-0.005em] transition-colors hover:bg-[oklch(100%_0_0/0.1)]"
              style={{
                color: pathname === t.href ? 'var(--accent)' : 'var(--bar-fg-muted)',
                background: pathname === t.href ? 'var(--accent-soft)' : undefined,
                fontWeight: pathname === t.href ? 700 : 500,
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="justify-self-end flex items-center gap-3">
          <GlobalSearch />
          <LangToggle />
        </div>
      </div>
    </nav>
  );
}
