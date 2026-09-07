'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '../login/actions';

interface NavItem {
  href: string;
  label: string;
}

const NAV_MAIN: NavItem[] = [{ href: '/admin', label: '대시보드' }];
const NAV_CONTENT: NavItem[] = [
  { href: '/admin/conferences', label: '행사 후보' },
  { href: '/admin/videos', label: '발표 영상' },
  { href: '/admin/sources', label: 'RSS 소스' },
];
const NAV_TOOL: NavItem[] = [{ href: '/admin/chat', label: 'RAG 챗봇' }];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const renderGroup = (label: string, items: NavItem[]) => (
    <div className="mb-7">
      <div
        className="px-3 mb-2 text-[12px]"
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
              aria-current={active ? 'page' : undefined}
              className="flex min-h-11 items-center px-3 py-2 rounded-md transition-colors hover:bg-(--color-bg-sunken)"
              style={{
                background: active ? 'var(--color-accent-soft)' : undefined,
                color: active ? 'var(--color-accent)' : 'var(--color-fg-muted)',
              }}
            >
              <span className="text-[14px]" style={{ fontWeight: active ? 700 : 500 }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <details
        key={pathname}
        className="lg:hidden border-b bg-(--color-bg-elevated) border-(--color-line) px-5"
      >
        <summary className="min-h-14 flex items-center justify-between gap-4 cursor-pointer list-none">
          <span className="font-bold text-(--color-fg-strong)">
            Devbrief <span className="font-medium text-sm text-(--color-fg-muted)">Admin</span>
          </span>
          <span className="text-sm text-(--color-accent)">관리자 메뉴</span>
        </summary>
        <nav aria-label="관리자 메뉴" className="grid grid-cols-2 gap-2 pb-4">
          {[...NAV_MAIN, ...NAV_CONTENT, ...NAV_TOOL].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className="min-h-11 flex items-center rounded-lg px-3 text-sm"
              style={{
                background: isActive(item.href) ? 'var(--color-accent-soft)' : undefined,
                color: isActive(item.href) ? 'var(--color-accent)' : 'var(--color-fg-default)',
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/" className="min-h-11 flex items-center px-3 text-sm">
            메인 사이트
          </Link>
          <form action={logout} className="col-span-2 border-t border-(--color-line) pt-2">
            <button type="submit" className="min-h-11 px-3 text-sm text-(--color-fg-muted)">
              로그아웃
            </button>
          </form>
        </nav>
      </details>
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col px-4 py-6 border-r"
        style={{
          borderColor: 'var(--color-line)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        {/* 로고 */}
        <Link href="/admin" className="flex min-h-11 items-baseline gap-2 mb-8 px-3">
          <span
            className="text-xl tracking-[-0.025em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            Devbrief
          </span>
          <span
            className="text-[12px]"
            style={{
              color: 'var(--color-fg-muted)',
              fontWeight: 500,
            }}
          >
            Admin
          </span>
        </Link>

        <nav aria-label="관리자 메뉴" className="flex-1 overflow-y-auto">
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
            className="flex min-h-11 items-center px-3 py-2 text-[14px] rounded-md transition-colors hover:bg-(--color-bg-sunken)"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            메인 사이트
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex min-h-11 items-center px-3 py-2 text-[14px] rounded-md transition-colors hover:bg-(--color-bg-sunken)"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              로그아웃
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
