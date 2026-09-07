import { MOCK_VIDEOS } from '@/lib/mock-videos';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/lib/mocks-enabled', () => ({
  get MOCKS_ENABLED() {
    return mockState.enabled;
  },
}));
vi.mock('@/components/site-nav', () => ({ SiteNav: () => null }));
vi.mock('@/components/video-detail', () => ({
  VideoDetail: ({ video, related }: { video: { id: string }; related: unknown[] }) => (
    <div data-testid="detail">
      {video.id}:{related.length}
    </div>
  ),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import VideoDetailPage, { generateMetadata } from './page';

const DB_VIDEO = {
  id: 'real-1',
  videoId: 'dQw4w9WgXcQ',
  title: 'Real talk',
  url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  channel: '실제 채널',
  thumbnailUrl: '',
  durationSec: 600,
  views: 100,
  publishedAt: '2026-07-01T00:00:00Z',
  topics: [],
  description: null,
  summary: null,
  chapters: null,
  chapterSource: null,
};

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  mockState.enabled = false;
});

describe('VideoDetailPage mock 격리 (c11)', () => {
  it('프로덕션: mock id(v1) 는 가짜 상세 대신 notFound 로 떨어진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(VideoDetailPage(params('v1'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('프로덕션: generateMetadata 도 mock 제목 대신 기본 타이틀을 쓴다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const meta = await generateMetadata(params('v1'));
    expect(meta.title).toBe('Devbrief');
  });

  it('개발(MOCKS_ENABLED): mock 영상 상세는 유지된다', async () => {
    mockState.enabled = true;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { getByTestId } = render(await VideoDetailPage(params('v1')));
    // 관련 영상도 mock 목록에서 자기 자신을 뺀 나머지
    expect(getByTestId('detail').textContent).toBe(`v1:${MOCK_VIDEOS.length - 1}`);
  });
});

describe('VideoDetailPage 관련 영상 mock 격리 (c45)', () => {
  it('프로덕션: 목록 API 만 실패해도 관련 영상에 mock 을 섞지 않는다(related=[])', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('?limit=')) throw new Error('list down');
        return { ok: true, json: async () => DB_VIDEO };
      }),
    );
    const { getByTestId } = render(await VideoDetailPage(params('real-1')));
    expect(getByTestId('detail').textContent).toBe('real-1:0');
  });

  it('프로덕션: 목록 빈 응답에도 mock 을 섞지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('?limit=')) return { ok: true, json: async () => [] };
        return { ok: true, json: async () => DB_VIDEO };
      }),
    );
    const { getByTestId } = render(await VideoDetailPage(params('real-1')));
    expect(getByTestId('detail').textContent).toBe('real-1:0');
  });

  it('목록 실데이터가 있으면 자기 자신을 제외하고 관련 영상으로 쓴다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('?limit=')) {
          return {
            ok: true,
            json: async () => [DB_VIDEO, { ...DB_VIDEO, id: 'real-2' }],
          };
        }
        return { ok: true, json: async () => DB_VIDEO };
      }),
    );
    const { getByTestId } = render(await VideoDetailPage(params('real-1')));
    expect(getByTestId('detail').textContent).toBe('real-1:1');
  });
});
