import { SiteNav } from '@/components/site-nav';
import { ConferencesView } from '@/components/conferences-view';
import { MOCK_CONFERENCES } from '@/lib/mock-conferences';

export default function ConferencesPage() {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <main
      className="min-h-screen px-6 sm:px-10 lg:px-12 pt-12 pb-24 max-w-5xl mx-auto"
      style={{ overflowX: 'clip' }}
    >
      <SiteNav />
      <header className="mb-10">
        <h1
          className="text-3xl sm:text-4xl leading-tight tracking-tight"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 500 }}
        >
          개발자 컨퍼런스
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          {today} · 한국 주요 컨퍼런스 일정 모음
        </p>
      </header>

      <ConferencesView conferences={MOCK_CONFERENCES} />
    </main>
  );
}
