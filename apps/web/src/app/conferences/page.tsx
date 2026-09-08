import { SiteNav } from '@/components/site-nav';
import { ConferencesTab } from '@/components/tabs/conferences-tab';
import { type ConferenceDto, MOCK_CONFERENCES } from '@/lib/mock-conferences';
import { MOCKS_ENABLED } from '@/lib/mocks-enabled';

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

// mock 폴백은 개발 환경 한정 — 프로덕션은 빈 배열을 내려 빈 상태 UI 에 맡긴다.
function mockFallback(): ConferenceDto[] {
  return MOCKS_ENABLED ? MOCK_CONFERENCES : [];
}

async function getConferences(): Promise<ConferenceDto[]> {
  try {
    const res = await fetch(`${API_BASE}/conferences?upcoming=1&limit=1000`, { cache: 'no-store' });
    if (!res.ok) return mockFallback();
    const data = (await res.json()) as DbConference[];
    if (data.length === 0) return mockFallback();
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
    return mockFallback();
  }
}

export default async function ConferencesPage() {
  const conferences = await getConferences();
  // 서버(Vercel)는 UTC 로 돌므로 KST 로 고정해야 자정~09시 사이에도 오늘 날짜가 맞다.
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  });

  return (
    <main className="min-h-screen px-6 sm:px-10 lg:px-16 xl:px-24 pt-12 pb-24 mx-auto overflow-x-clip">
      <SiteNav />
      <header className="mb-10">
        <h1
          className="text-3xl sm:text-4xl leading-tight tracking-tight"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 500 }}
        >
          행사
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          {today} · 국내외 컨퍼런스·해커톤·밋업·세미나 일정
        </p>
      </header>

      {conferences.length > 0 ? (
        <ConferencesTab conferences={conferences} />
      ) : (
        <section
          className="flex flex-col items-center text-center gap-2 py-20 px-6 rounded-lg"
          style={{
            border: '1px dashed var(--color-line-strong)',
            background: 'var(--color-bg-sunken)',
          }}
        >
          <p className="text-[15px]" style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}>
            아직 보여드릴 행사 일정이 없어요.
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-fg-muted)' }}>
            일정을 불러오지 못했거나 등록된 일정이 없습니다.
            <br />
            잠시 후 새로고침으로 다시 확인해주세요.
          </p>
        </section>
      )}
    </main>
  );
}
