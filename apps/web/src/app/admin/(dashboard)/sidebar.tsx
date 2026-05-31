'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '../login/actions';

const NAV: Array<{ href: string; label: string; hint: string }> = [
  { href: '/admin', label: '대시보드', hint: 'overview' },
  { href: '/admin/conferences', label: '컨퍼런스 후보', hint: 'discovery' },
  { href: '/admin/videos', label: '발표 영상', hint: 'youtube' },
  { href: '/admin/sources', label: 'RSS 소스', hint: 'feeds' },
  { href: '/admin/chat', label: 'RAG 챗봇', hint: 'gemini' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col px-5 py-7 border-r"
      style={{
        borderColor: 'var(--color-line)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      {/* 로고 */}
      <Link href="/admin" className="flex items-baseline gap-2 mb-8 px-1">
        <span
          className="text-[13px] tracking-[0.28em] uppercase"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          Pulse
        </span>
        <span
          className="text-[9px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--color-accent)',
            background: 'oklch(80% 0.12 60 / 0.15)',
            fontWeight: 700,
          }}
        >
          Admin
        </span>
      </Link>

      {/* nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-baseline justify-between px-3 py-2 rounded transition-colors"
              style={{
                background: active ? 'var(--color-bg-sunken)' : 'transparent',
                color: active
                  ? 'var(--color-fg-strong)'
                  : 'var(--color-fg-muted)',
              }}
            >
              <span
                className="text-[13.5px] tracking-[-0.005em]"
                style={{ fontWeight: active ? 700 : 500 }}
              >
                {item.label}
              </span>
              <span
                className="text-[9px] tracking-[0.15em] uppercase"
                style={{ color: 'var(--color-fg-subtle)', fontWeight: 600 }}
              >
                {item.hint}
              </span>
            </Link>
          );
        })}
      </nav>

      <span className="flex-1" />

      {/* 하단 — 메인 / 로그아웃 */}
      <div className="flex flex-col gap-1 pt-4 border-t" style={{ borderColor: 'var(--color-line)' }}>
        <Link
          href="/"
          className="px-3 py-2 text-[12.5px] transition-colors rounded hover:bg-(--color-bg-sunken)"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          ← 메인 사이트
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left px-3 py-2 text-[12.5px] transition-colors rounded hover:bg-(--color-bg-sunken)"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
