import { ConferencesView } from '@/components/conferences-view';
import { SiteNav } from '@/components/site-nav';
import { type ConferenceDto, MOCK_CONFERENCES } from '@/lib/mock-conferences';

import { API_BASE } from '@/lib/api';

interface DbConference {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate: string | null;
  location: string;
  topics: string[];
  description: string | null;
  imageUrl: string | null;
  brandColor: string | null;
}

async function getConferences(): Promise<ConferenceDto[]> {
  try {
    const res = await fetch(`${API_BASE}/conferences`, { cache: 'no-store' });
    if (!res.ok) return MOCK_CONFERENCES;
    const data = (await res.json()) as DbConference[];
    if (data.length === 0) return MOCK_CONFERENCES;
    return data.map((d) => ({
      id: d.id,
      name: d.name,
      url: d.url,
      startDate: d.startDate,
      endDate: d.endDate,
      location: d.location,
      topics: d.topics,
      description: d.description,
      imageUrl: d.imageUrl,
      brand: d.brandColor ?? undefined,
    }));
  } catch {
    return MOCK_CONFERENCES;
  }
}

export default async function ConferencesPage() {
  const conferences = await getConferences();
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <main className="min-h-screen px-6 sm:px-10 lg:px-16 xl:px-24 pt-12 pb-24 mx-auto overflow-x-clip">
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

      <ConferencesView conferences={conferences} />
    </main>
  );
}
