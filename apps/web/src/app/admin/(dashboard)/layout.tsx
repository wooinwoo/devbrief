import type { ReactNode } from 'react';
import { AdminSidebar } from './sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ overflowX: 'clip', background: 'var(--color-bg-base)' }}
    >
      <AdminSidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <main id="main-content" className="px-5 sm:px-10 py-8 sm:py-12 max-w-6xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
