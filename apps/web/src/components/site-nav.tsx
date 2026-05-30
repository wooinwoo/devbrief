'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: '오늘의 흐름' },
  { href: '/conferences', label: '컨퍼런스' },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-10 flex items-center gap-1">
      <Link
        href="/"
        className="text-[11px] mr-4 tracking-[0.25em] uppercase"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        Pulse
      </Link>
      {ITEMS.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="text-[13px] px-3 py-1.5 rounded-full transition-colors"
            style={{
              color: active ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
              background: active ? 'var(--color-bg-elevated)' : 'transparent',
            }}
          >
            <span className="hover:text-(--color-fg-strong) transition-colors">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
