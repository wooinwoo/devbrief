import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SourcesPanel } from './sources-panel';

// next/navigation 의 useRouter 는 jsdom 에 없으므로 모킹한다.
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const SOURCE = {
  id: 's1',
  provider: 'rss',
  name: '예시 블로그',
  feedUrl: 'https://blog.example.com/feed.xml',
  homepage: 'https://blog.example.com',
  language: 'ko',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  refresh.mockClear();
});

describe('SourcesPanel', () => {
  it('초기 소스 목록을 렌더한다', () => {
    const { getByText } = render(<SourcesPanel initialSources={[SOURCE]} />);
    expect(getByText('예시 블로그')).toBeTruthy();
    expect(getByText(SOURCE.feedUrl)).toBeTruthy();
  });

  it('소스가 없으면 빈 상태 안내를 보여준다', () => {
    const { getByText } = render(<SourcesPanel initialSources={[]} />);
    expect(getByText(/등록된 소스가 없어요/)).toBeTruthy();
  });

  it('토글 성공(res.ok) 시 router.refresh 호출, 에러는 없음', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );
    const { getByText, queryByText } = render(<SourcesPanel initialSources={[SOURCE]} />);

    fireEvent.click(getByText('끄기'));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(queryByText(/오류:/)).toBeNull();
  });

  it('토글 실패(res.ok=false) 시 상태 코드와 함께 에러를 표시한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    const { getByText, findByText } = render(<SourcesPanel initialSources={[SOURCE]} />);

    fireEvent.click(getByText('끄기'));

    const err = await findByText(/소스 상태 변경 실패 \(500\)/);
    expect(err).toBeTruthy();
    // 실패 시 refresh 는 호출되지 않는다.
    expect(refresh).not.toHaveBeenCalled();
  });

  it('삭제 실패(res.ok=false) 시 에러를 표시한다 (confirm 승인)', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
    const { getByText, findByText } = render(<SourcesPanel initialSources={[SOURCE]} />);

    fireEvent.click(getByText('삭제'));

    const err = await findByText(/소스 삭제 실패 \(404\)/);
    expect(err).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('삭제 confirm 취소 시 fetch 를 호출하지 않는다', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    vi.stubGlobal('fetch', fetchMock);
    const { getByText } = render(<SourcesPanel initialSources={[SOURCE]} />);

    fireEvent.click(getByText('삭제'));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
