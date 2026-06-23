'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '../login/actions';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_MAIN: NavItem[] = [{ href: '/admin', label: '대시보드', icon: '◰' }];
const NAV_CONTENT: NavItem[] = [
  { href: '/admin/conferences', label: '컨퍼런스 후보', icon: '◆' },
  { href: '/admin/videos', label: '발표 영상', icon: '▶' },
  { href: '/admin/sources', label: 'RSS 소스', icon: '⊚' },
];
const NAV_TOOL: NavItem[] = [{ href: '/admin/chat', label: 'RAG 챗봇', icon: '✦' }];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const renderGroup = (label: string, items: NavItem[]) => (
    <div className="mb-5">
      <div
        className="px-3 mb-1.5 text-[10px] tracking-[0.18em] uppercase"
        style={{ color: 'var(--color-fg-subtle)', fontWeight: 600 }}
      >
        {label}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors"
              style={{
                background: active ? 'var(--color-bg-sunken)' : 'transparent',
                color: active ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
              }}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                  style={{ background: 'var(--color-accent)' }}
                />
              )}
              <span
                aria-hidden
                className="text-[13px] w-4 text-center shrink-0"
                style={{
                  color: active ? 'var(--color-accent)' : 'var(--color-fg-subtle)',
                }}
              >
                {item.icon}
              </span>
              <span
                className="text-[13.5px] tracking-[-0.005em]"
                style={{ fontWeight: active ? 700 : 500 }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col px-4 py-6 border-r"
      style={{
        borderColor: 'var(--color-line)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      {/* 로고 */}
      <Link href="/admin" className="flex items-center gap-2 mb-7 px-3">
        <span
          className="text-[14px] tracking-[0.26em] uppercase"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          Devbrief
        </span>
        <span
          className="text-[9px] tracking-[0.16em] uppercase px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--color-accent)',
            background: 'oklch(80% 0.12 60 / 0.16)',
            fontWeight: 700,
          }}
        >
          Admin
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto">
        {renderGroup('개요', NAV_MAIN)}
        {renderGroup('콘텐츠', NAV_CONTENT)}
        {renderGroup('도구', NAV_TOOL)}
      </nav>

      {/* 하단 */}
      <div
        className="flex flex-col gap-0.5 pt-4 border-t"
        style={{ borderColor: 'var(--color-line)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-md transition-colors hover:bg-(--color-bg-sunken)"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          <span aria-hidden className="w-4 text-center shrink-0">
            ↗
          </span>
          메인 사이트
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-md transition-colors hover:bg-(--color-bg-sunken)"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            <span aria-hidden className="w-4 text-center shrink-0">
              ⏻
            </span>
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
