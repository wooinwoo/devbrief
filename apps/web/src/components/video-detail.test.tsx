import { MOCK_VIDEOS } from '@/lib/mock-videos';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VideoDetail } from './video-detail';

afterEach(cleanup);

const REAL_VIDEO = {
  ...MOCK_VIDEOS[0],
  id: 'real-1',
  videoId: 'dQw4w9WgXcQ', // 실제 YouTube videoId 형식
};

describe('VideoDetail mock 임베드 라벨 (c47)', () => {
  it('mock 영상(videoId mock-*)은 임베드 대신 플레이스홀더 + 샘플 라벨을 표시한다', () => {
    const { container, getByText } = render(<VideoDetail video={MOCK_VIDEOS[0]} related={[]} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(getByText('개발용 샘플 데이터')).toBeTruthy();
  });

  it('실제 영상은 iframe 임베드를 렌더하고 샘플 라벨이 없다', () => {
    const { container, queryByText } = render(<VideoDetail video={REAL_VIDEO} related={[]} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toContain('youtube.com/embed/dQw4w9WgXcQ');
    expect(queryByText('개발용 샘플 데이터')).toBeNull();
  });

  it('videoId 형식이 깨진 실데이터는 플레이스홀더는 그리되 샘플 라벨은 붙이지 않는다', () => {
    const { container, queryByText } = render(
      <VideoDetail video={{ ...REAL_VIDEO, videoId: '' }} related={[]} />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(queryByText('개발용 샘플 데이터')).toBeNull();
  });

  it('관련 영상이 없으면 관련 영상 섹션을 렌더하지 않는다 (c45 연계)', () => {
    const { queryByText } = render(<VideoDetail video={REAL_VIDEO} related={[]} />);
    expect(queryByText('관련 영상')).toBeNull();
  });
});
