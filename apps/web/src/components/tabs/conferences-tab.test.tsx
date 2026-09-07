import { cleanup, fireEvent, render } from '@testing-library/react';
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
  });
  it('행사 유형은 배타적으로 분류하고 전환 시 주제와 페이지를 초기화한다', () => {
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
    fireEvent.click(getByRole('button', { name: '해커톤 2' }));
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
  const events = [
    { id: 'kr', name: 'Seoul JS', location: 'Seoul (South Korea)' },
    { id: 'online', name: 'Remote Summit', location: 'Online' },
    { id: 'overseas', name: 'Paris Days', location: 'Paris (France)' },
  ].map((c) => ({ ...c, url: `https://example.com/${c.id}`, startDate: '2099-01-01', topics: [] }));
  const view = render(<ConferencesTab conferences={events} />);
  fireEvent.change(view.getByRole('combobox', { name: '행사 지역' }), {
    target: { value: 'korea' },
  });
  expect(view.getAllByRole('listitem')).toHaveLength(1);
  expect(view.getByRole('link', { name: 'Seoul JS' })).toBeTruthy();
  fireEvent.change(view.getByRole('combobox', { name: '행사 지역' }), {
    target: { value: 'online' },
  });
  expect(view.getAllByRole('listitem')).toHaveLength(1);
  expect(view.getByRole('link', { name: 'Remote Summit' })).toBeTruthy();
  fireEvent.click(view.getByRole('button', { name: '초기화' }));
  expect(view.getAllByRole('listitem')).toHaveLength(3);
});
