import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AdminVideo, VideosPanel } from './videos-panel';

// next/navigation 의 useRouter 는 jsdom 에 없으므로 모킹한다.
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const VIDEO: AdminVideo = {
  id: 'v1',
  videoId: 'abc123',
  title: '테스트 발표 영상',
  channel: '테크 채널',
  thumbnailUrl: '',
  durationSec: 300,
  views: 1000,
  chapterSource: null,
  summary: null,
  analyzedAt: null,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  refresh.mockClear();
});

describe('VideosPanel', () => {
  it('삭제 성공(res.ok) 시 router.refresh 호출, 에러 없음', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );
    const { getByText, queryByText } = render(<VideosPanel initialVideos={[VIDEO]} />);

    fireEvent.click(getByText('삭제'));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(queryByText(/오류:/)).toBeNull();
  });

  it('삭제 실패(404) 시 에러를 표시하고 refresh 하지 않는다', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
    const { getByText, findByText } = render(<VideosPanel initialVideos={[VIDEO]} />);

    fireEvent.click(getByText('삭제'));

    const err = await findByText(/영상 삭제 실패 \(404\)/);
    expect(err).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('추가 실패 시 서버 메시지를 표시한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ statusCode: 400, message: '지원하지 않는 URL' }),
      }),
    );
    const { getByLabelText, getByText, findByText } = render(<VideosPanel initialVideos={[]} />);

    fireEvent.change(getByLabelText('YouTube 영상 URL'), {
      target: { value: 'https://youtu.be/abc' },
    });
    fireEvent.click(getByText('추가'));

    const err = await findByText(/지원하지 않는 URL/);
    expect(err).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
