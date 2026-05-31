import type { ReactNode } from 'react';
import { AdminSidebar } from './sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex"
      style={{ overflowX: 'clip', background: 'var(--color-bg-sunken)' }}
    >
      <AdminSidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <main className="px-6 sm:px-10 py-10 max-w-5xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
