import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConferencesTab } from './conferences-tab';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ConferencesTab', () => {
  it('진행 중인 행사와 해커톤을 검색하고 24개씩 이동한다', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-07T04:00:00Z'));
    const conferences = Array.from({ length: 26 }, (_, i) => ({
      id: `c${i}`,
      name: `행사 ${i}`,
      url: `https://example.com/${i}`,
      startDate: i === 0 ? '2026-09-01' : '2026-10-01',
      endDate: i === 0 ? '2026-09-08' : null,
      location: '서울',
      topics: i === 25 ? ['Hackathon'] : ['AI'],
      description: null,
      imageUrl: null,
    }));
    const { getByRole, getByText, queryByText, getAllByRole } = render(
      <ConferencesTab conferences={conferences} />,
    );
    expect(getByText('진행 중')).toBeTruthy();
    expect(getAllByRole('listitem')).toHaveLength(24);
    expect(queryByText('행사 25')).toBeNull();
    fireEvent.click(getByRole('button', { name: '다음 페이지' }));
    expect(getByRole('link', { name: /행사 25/ })).toBeTruthy();
    fireEvent.change(getByRole('searchbox'), { target: { value: 'hackathon' } });
    expect(getAllByRole('listitem')).toHaveLength(1);
    expect(getByRole('link', { name: /행사 25/ })).toBeTruthy();
    expect(getByRole('button', { name: '전체 1' })).toBeTruthy();
    expect(getByRole('button', { name: '컨퍼런스 0' })).toBeTruthy();
    expect(getByRole('button', { name: '해커톤 1' })).toBeTruthy();
  });
  it('유형 전환에도 주제를 유지해 표시 건수와 결과를 일치시키고 0건에서도 해제할 수 있다', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-07T04:00:00Z'));
    const events = [
      { id: 'conf', name: 'Python Summit', topics: ['Python'], startDate: '2026-10-01' },
      { id: 'hack', name: 'Campus Build', topics: ['hackathon'], startDate: '2026-09-12' },
      { id: 'name', name: '서울 해커톤', topics: ['AI'], startDate: '2026-09-13' },
      { id: 'past', name: '지난 해커톤', topics: ['Hackathon'], startDate: '2026-09-01' },
    ].map((c) => ({ ...c, url: `https://example.com/${c.id}`, location: '서울' }));
    const { getByRole, getAllByRole, queryByRole, getByText } = render(
      <ConferencesTab conferences={events} />,
    );
    expect(getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(getByRole('button', { name: '컨퍼런스 1' }));
    expect(getByRole('button', { name: '컨퍼런스 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(getAllByRole('listitem')).toHaveLength(1);
    fireEvent.change(getByRole('combobox', { name: '행사 주제' }), { target: { value: 'Python' } });
    expect(getByRole('button', { name: '전체 1' })).toBeTruthy();
    fireEvent.click(getByRole('button', { name: '해커톤 0' }));
    expect(getByRole('button', { name: '해커톤 0' }).getAttribute('aria-pressed')).toBe('true');
    expect(queryByRole('listitem')).toBeNull();
    expect((getByRole('combobox', { name: '행사 주제' }) as HTMLSelectElement).value).toBe(
      'Python',
    );
    fireEvent.change(getByRole('combobox', { name: '행사 주제' }), { target: { value: '' } });
    expect(getByRole('button', { name: '해커톤 2' })).toBeTruthy();
    expect(getAllByRole('listitem')).toHaveLength(2);
    expect(queryByRole('link', { name: /Python Summit/ })).toBeNull();
    expect(queryByRole('link', { name: /지난 해커톤/ })).toBeNull();
    expect((getByRole('combobox', { name: '행사 주제' }) as HTMLSelectElement).value).toBe('');
    fireEvent.change(getByRole('searchbox'), { target: { value: '없는 행사' } });
    expect(getByText('조건에 맞는 행사가 없어요.')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: '전체 행사 보기' }));
    expect(getAllByRole('listitem')).toHaveLength(3);
    expect(getByRole('button', { name: '전체 3' }).getAttribute('aria-pressed')).toBe('true');
  });
});

it('filters domestic and online events and restores all regions on reset', () => {
  vi.useFakeTimers().setSystemTime(new Date('2026-09-07T04:00:00Z'));
  const events = [
    { id: 'kr', name: 'Seoul JS', location: 'Seoul (South Korea)' },
    { id: 'online', name: 'Remote Summit', location: 'Online' },
    { id: 'overseas', name: 'Paris Days', location: 'Paris (France)' },
    { id: 'hack', name: 'Remote Build', location: '온라인', topics: ['Hackathon'] },
  ].map((c) => ({ topics: [], ...c, url: `https://example.com/${c.id}`, startDate: '2099-01-01' }));
  const view = render(<ConferencesTab conferences={events} />);
  expect(view.getByRole('button', { name: '전체 지역' }).getAttribute('aria-pressed')).toBe('true');
  expect(view.getAllByRole('listitem')).toHaveLength(4);
  fireEvent.click(view.getByRole('button', { name: '국내 행사' }));
  expect(view.getAllByRole('listitem')).toHaveLength(1);
  expect(view.getByRole('link', { name: 'Seoul JS' })).toBeTruthy();
  fireEvent.click(view.getByRole('button', { name: '전체 지역' }));
  expect(view.getAllByRole('listitem')).toHaveLength(4);
  fireEvent.click(view.getByRole('button', { name: '국내 행사' }));
  expect(view.getByRole('button', { name: '전체 1' })).toBeTruthy();
  expect(view.getByRole('button', { name: '해커톤 0' })).toBeTruthy();
  fireEvent.click(view.getByRole('button', { name: '온라인' }));
  expect(view.getAllByRole('listitem')).toHaveLength(2);
  expect(view.getByRole('link', { name: 'Remote Summit' })).toBeTruthy();
  expect(view.getByRole('button', { name: '전체 2' })).toBeTruthy();
  fireEvent.click(view.getByRole('button', { name: '해커톤 1' }));
  expect(view.getAllByRole('listitem')).toHaveLength(1);
  expect(view.getByRole('link', { name: 'Remote Build' })).toBeTruthy();
  fireEvent.change(view.getByRole('combobox', { name: '개최 시기' }), {
    target: { value: 'soon' },
  });
  expect(view.getByRole('button', { name: '전체 0' })).toBeTruthy();
  expect(view.getByRole('button', { name: '해커톤 0' }).getAttribute('aria-pressed')).toBe('true');
  expect(view.queryByRole('listitem')).toBeNull();
  fireEvent.change(view.getByRole('combobox', { name: '개최 시기' }), {
    target: { value: 'later' },
  });
  expect(view.getByRole('button', { name: '해커톤 1' })).toBeTruthy();
  fireEvent.click(view.getByRole('button', { name: '초기화' }));
  expect(view.getAllByRole('listitem')).toHaveLength(4);
});

it('국내 밋업·세미나를 별도 집계하고 검색·지역 조건과 함께 선택·해제한다', () => {
  vi.useFakeTimers().setSystemTime(new Date('2026-09-08T04:00:00Z'));
  const events = [
    {
      id: 'meetup',
      name: 'Cloud Community Day',
      location: '경기도 용인시',
      topics: ['Meetup', 'Cloud'],
    },
    { id: 'conf', name: 'Cloud Conference', location: '서울', topics: ['Cloud'] },
    { id: 'hack', name: 'Cloud Hackathon', location: '부산', topics: ['Hackathon', 'Cloud'] },
    {
      id: 'foreign',
      name: 'Cloud Meetup',
      location: 'Cambridge (UK)',
      topics: ['Meetup', 'Cloud'],
    },
  ].map((event) => ({ ...event, url: `https://example.com/${event.id}`, startDate: '2026-10-01' }));
  const view = render(<ConferencesTab conferences={events} />);
  expect(view.getByRole('button', { name: '밋업·세미나 2' })).toBeTruthy();
  expect(view.getByRole('button', { name: '전체 지역' }).getAttribute('aria-pressed')).toBe('true');
  expect(view.getAllByRole('listitem')).toHaveLength(4);
  fireEvent.click(view.getByRole('button', { name: '국내 행사' }));
  expect(view.getByRole('button', { name: '전체 3' })).toBeTruthy();
  expect(view.getByRole('button', { name: '컨퍼런스 1' })).toBeTruthy();
  expect(view.getByRole('button', { name: '해커톤 1' })).toBeTruthy();
  fireEvent.click(view.getByRole('button', { name: '밋업·세미나 1' }));
  const meetup = within(view.getByRole('listitem'));
  expect(meetup.getByText('밋업·세미나')).toBeTruthy();
  expect(meetup.getByRole('link', { name: 'Cloud Community Day' })).toBeTruthy();
  expect(meetup.queryByText('Meetup')).toBeNull();
  expect(view.queryByRole('option', { name: 'Meetup' })).toBeNull();
  fireEvent.change(view.getByRole('searchbox'), { target: { value: 'missing' } });
  expect(view.getByRole('button', { name: '밋업·세미나 0' }).getAttribute('aria-pressed')).toBe(
    'true',
  );
  expect(view.queryByRole('listitem')).toBeNull();
  fireEvent.click(view.getByRole('button', { name: '전체 행사 보기' }));
  expect(view.getAllByRole('listitem')).toHaveLength(4);
  expect(view.getByRole('button', { name: '밋업·세미나 2' }).getAttribute('aria-pressed')).toBe(
    'false',
  );
});
