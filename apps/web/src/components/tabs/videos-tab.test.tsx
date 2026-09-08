import { MOCK_VIDEOS } from '@/lib/mock-videos';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VideosTab } from './videos-tab';

afterEach(cleanup);

describe('VideosTab 검색과 필터', () => {
  it('제목·채널·주제 검색을 필터와 함께 적용하고 빈 결과에서 정렬을 유지하며 복구한다', () => {
    const videos = [
      {
        ...MOCK_VIDEOS[0],
        id: 'recent',
        title: 'React performance',
        channel: 'Dev Talks',
        topics: ['Performance'],
        views: 10,
        publishedAt: '2026-09-08T00:00:00Z',
      },
      {
        ...MOCK_VIDEOS[0],
        id: 'popular',
        title: 'React SSR',
        channel: 'Dev Talks',
        topics: ['Performance'],
        views: 200,
        publishedAt: '2026-09-07T00:00:00Z',
      },
      {
        ...MOCK_VIDEOS[0],
        id: 'other',
        title: 'React guide',
        channel: 'Other Talks',
        topics: ['Performance'],
        views: 500,
      },
      {
        ...MOCK_VIDEOS[0],
        id: 'backend',
        title: 'React API',
        channel: 'Dev Talks',
        topics: ['Backend'],
        views: 700,
      },
    ];
    const view = render(<VideosTab videos={videos} />);
    fireEvent.click(view.getByRole('button', { name: /^Dev Talks/ }));
    fireEvent.click(view.getByRole('button', { name: /^Performance/ }));
    fireEvent.click(view.getByRole('button', { name: '조회수순' }));
    const input = view.getByRole('searchbox', { name: '발표 제목, 채널, 주제로 검색' });

    for (const query of ['  rEaCt  ', 'DEV TALKS', 'performance']) {
      fireEvent.change(input, { target: { value: query } });
      expect(
        view.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
      ).toEqual(['React SSR', 'React performance']);
    }

    fireEvent.change(input, { target: { value: '없는 발표' } });
    expect(view.queryByRole('heading', { level: 3 })).toBeNull();
    fireEvent.click(view.getByRole('button', { name: '검색·필터 초기화' }));
    expect((input as HTMLInputElement).value).toBe('');
    expect(view.getAllByRole('heading', { level: 3 })).toHaveLength(4);
    expect(view.getAllByRole('heading', { level: 3 })[0].textContent).toBe('React API');
    expect(view.getByRole('button', { name: '조회수순' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
});
