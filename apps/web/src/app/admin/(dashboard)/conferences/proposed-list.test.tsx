import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProposedConferenceList } from './proposed-list';

// next/navigation 의 useRouter 는 jsdom 에 없으므로 모킹한다.
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const ITEM = {
  id: 'c1',
  name: 'DevConf Seoul',
  url: 'https://devconf.example.com',
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: null,
  location: '서울',
  topics: ['ai'],
  imageUrl: null,
  brandColor: null,
  discoveredFromArticleId: null,
  discoveredAt: null,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  refresh.mockClear();
});

describe('ProposedConferenceList', () => {
  it('후보는 20개씩 표시하고 검색하면 첫 페이지로 돌아간다', () => {
    const items = Array.from({ length: 25 }, (_, index) => ({
      ...ITEM,
      id: `c${index}`,
      name: `행사 ${index}`,
      topics: index === 24 ? ['Hackathon'] : ['AI'],
    }));
    const { getAllByRole, getByRole, getByText, queryByText } = render(
      <ProposedConferenceList items={items} />,
    );
    expect(getAllByRole('button', { name: '승인' })).toHaveLength(20);
    expect(queryByText('행사 24')).toBeNull();
    fireEvent.click(getByRole('button', { name: '다음 페이지' }));
    expect(getAllByRole('button', { name: '승인' })).toHaveLength(5);
    fireEvent.change(getByRole('searchbox'), { target: { value: 'hackathon' } });
    expect(getAllByRole('button', { name: '승인' })).toHaveLength(1);
    expect(getByText('행사 24')).toBeTruthy();
    fireEvent.change(getByRole('searchbox'), { target: { value: '없는 행사' } });
    expect(getByText(/검색 결과가 없어요/)).toBeTruthy();
  });
  it('후보가 없으면 빈 상태 안내를 보여준다', () => {
    const { getByText } = render(<ProposedConferenceList items={[]} />);
    expect(getByText(/대기 중인 후보가 없어요/)).toBeTruthy();
  });

  it('승인 성공(res.ok) 시 router.refresh 호출, 에러 없음', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );
    const { getByText, queryByText } = render(<ProposedConferenceList items={[ITEM]} />);

    fireEvent.click(getByText('승인'));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(queryByText(/오류:/)).toBeNull();
  });

  it('승인 실패(401) 시 에러를 표시하고 refresh 하지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthorized' }),
      }),
    );
    const { getByText, findByText } = render(<ProposedConferenceList items={[ITEM]} />);

    fireEvent.click(getByText('승인'));

    const err = await findByText(/세션이 만료/);
    expect(err).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('거절 실패(500) 시 폴백 메시지를 표시한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    const { getByText, findByText } = render(<ProposedConferenceList items={[ITEM]} />);

    fireEvent.click(getByText('거절'));

    const err = await findByText(/거절 실패 \(500\)/);
    expect(err).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
