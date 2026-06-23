'use client';

import Link from 'next/link';
import { LangToggle } from './lang-toggle';

const TABS = [
  { href: '/?tab=all', label: '오늘' },
  { href: '/?tab=ai', label: 'AI' },
  { href: '/?tab=articles', label: '개발 뉴스' },
  { href: '/?tab=conferences', label: '컨퍼런스' },
  { href: '/?tab=videos', label: '발표 영상' },
  { href: '/?tab=repos', label: '오픈소스' },
  { href: '/?tab=saved', label: '저장' },
];

/** 글/영상 상세 상단 네비 — 메인 헤더와 동일한 비주얼 언어. */
export function SiteNav() {
  return (
    <nav
      className="mb-9 mx-[calc(50%-50vw)] border-b"
      style={{ borderColor: 'var(--bar-line)', background: 'var(--bar-bg)' }}
    >
      <div className="px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 flex items-center gap-4 sm:gap-8 h-[68px]">
        <Link
          href="/"
          className="shrink-0 text-[21px] tracking-[-0.02em]"
          style={{ color: 'var(--bar-fg)', fontWeight: 800 }}
        >
          Dev<span style={{ color: 'var(--bar-accent)' }}>brief</span>
        </Link>
        <div className="no-scrollbar flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="shrink-0 px-3 sm:px-3.5 py-2 rounded-lg text-[14px] sm:text-[14.5px] tracking-[-0.005em] transition-colors hover:bg-[oklch(100%_0_0/0.1)]"
              style={{ color: 'var(--bar-fg-muted)', fontWeight: 500 }}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <span className="flex-1" />
        <LangToggle />
      </div>
    </nav>
  );
}
