import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ overflowX: 'clip' }}>
      <nav
        className="px-6 sm:px-10 lg:px-16 py-4 flex items-center gap-8 border-b"
        style={{ borderColor: 'var(--color-line)' }}
      >
        <Link
          href="/"
          className="text-[12px] tracking-[0.25em] uppercase"
          style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
        >
          PULSE
        </Link>
        <span
          className="text-[11px] tracking-[0.2em] uppercase px-2 py-0.5 rounded"
          style={{
            color: 'var(--color-accent)',
            background: 'oklch(80% 0.12 60 / 0.15)',
            fontWeight: 600,
          }}
        >
          ADMIN
        </span>
        <div className="flex gap-6 text-[13px] ml-4">
          <Link
            href="/admin/conferences"
            className="hover:text-(--color-fg-strong)"
            style={{ color: 'var(--color-fg-default)' }}
          >
            컨퍼런스 후보
          </Link>
          <Link
            href="/admin/sources"
            className="hover:text-(--color-fg-strong)"
            style={{ color: 'var(--color-fg-default)' }}
          >
            RSS 소스
          </Link>
        </div>
        <span className="flex-1" />
        <Link
          href="/"
          className="text-[12px] transition-colors"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          ← 메인으로
        </Link>
      </nav>
      <main className="px-6 sm:px-10 lg:px-16 py-12 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
}
