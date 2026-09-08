import { MOCK_VIDEOS } from '@/lib/mock-videos';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { VideoCard } from './video-card';

afterEach(cleanup);

it('shows a duration badge only when the video length is known', () => {
  const video = { ...MOCK_VIDEOS[0], durationSec: 0 };
  const view = render(<VideoCard video={video} />);
  expect(view.queryByText('길이 미제공')).toBeNull();
  expect(view.getByRole('link').getAttribute('href')).toBe(`/videos/${video.id}`);

  view.rerender(<VideoCard video={{ ...video, durationSec: 75 }} />);
  expect(view.getByText('1:15')).toBeTruthy();

  view.rerender(<VideoCard video={{ ...video, durationSec: Number.NaN }} />);
  expect(view.queryByText('1:15')).toBeNull();
});
