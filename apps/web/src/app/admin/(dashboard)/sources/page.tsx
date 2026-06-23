import { SourcesPanel } from './sources-panel';

interface SourceDto {
  id: string;
  provider: string;
  name: string;
  feedUrl: string;
  homepage: string | null;
  language: string;
  active: boolean;
  createdAt: string;
}

import { API_BASE } from '@/lib/api';

async function getSources(): Promise<SourceDto[]> {
  try {
    const res = await fetch(`${API_BASE}/sources`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as SourceDto[];
  } catch {
    return [];
  }
}

export default async function AdminSourcesPage() {
  const sources = await getSources();
  return (
    <div>
      <header className="mb-10">
        <h1
          className="text-[2rem] leading-none tracking-[-0.025em] break-keep mb-2"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          RSS 소스 관리
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
          블로그 / 매거진 URL 을 입력하면 RSS 피드를 자동으로 발견해 등록합니다.
        </p>
      </header>
      <SourcesPanel initialSources={sources} />
    </div>
  );
}
