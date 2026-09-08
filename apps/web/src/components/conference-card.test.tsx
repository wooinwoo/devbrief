import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConferenceCard } from './conference-card';
afterEach(cleanup);
const conference = {
  id: 'rust',
  name: 'Rust Conf',
  url: 'https://event.test',
  startDate: '2026-10-01',
  location: '서울',
  topics: ['Rust'],
  imageUrl: null as string | null,
};
describe('ConferenceCard image recovery', () => {
  it('keeps the date and event type without an empty image cover', () => {
    const { container } = render(<ConferenceCard conference={conference} />);
    expect(container.querySelector('h3')?.textContent).toBe('Rust Conf');
    const date = container.querySelector('time');
    expect(date?.getAttribute('datetime')).toBe('2026-10-01');
    expect(date?.textContent?.trim()).toBe('2026.10.01');
    expect(container.querySelectorAll('time')).toHaveLength(1);
    expect(container.querySelector('.event-card-header .event-kind')?.textContent).toBe('컨퍼런스');
    expect(container.querySelector('.event-cover')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
  it('keeps the event header after an image failure and retries a newly supplied URL', () => {
    const { container, rerender } = render(
      <ConferenceCard conference={{ ...conference, imageUrl: 'https://event.test/broken.png' }} />,
    );
    const image = container.querySelector('img')!;
    fireEvent.error(image);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('time')?.getAttribute('aria-label')).toBe('2026-10-01');
    expect(container.querySelector('.event-card-header .event-kind')?.textContent).toBe('컨퍼런스');
    rerender(
      <ConferenceCard conference={{ ...conference, imageUrl: 'https://event.test/fixed.png' }} />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://event.test/fixed.png',
    );
  });
  it('preserves the accessible date range beside the image', () => {
    const { getByLabelText, container } = render(
      <ConferenceCard
        conference={{
          ...conference,
          endDate: '2026-10-03',
          imageUrl: 'https://event.test/cover.png',
        }}
      />,
    );
    const date = getByLabelText('2026-10-01부터 2026-10-03까지');
    expect(date.tagName).toBe('TIME');
    expect(date.textContent).toContain('2026.10.01');
    expect(date.textContent).toContain('10.03');
    expect(container.querySelector('.event-card-header')?.contains(date)).toBe(true);
    expect(container.querySelector('.event-card-header img')).toBeTruthy();
  });
  it('preserves each source description without labeling a meetup source as MLH', () => {
    const { container, rerender } = render(
      <ConferenceCard
        conference={{
          ...conference,
          topics: ['Meetup', 'AI'],
          description: '일정 출처: AWSKRUG 공식 행사 페이지',
        }}
      />,
    );
    expect(container.querySelector('.event-kind')?.textContent).toBe('밋업·세미나');
    expect(container.querySelector('.event-tags')?.textContent).toBe('AI');
    expect(container.querySelector('.event-source summary')?.textContent).toBe('일정 출처');
    expect(container.querySelector('.event-source p')?.textContent).toBe(
      '일정 출처: AWSKRUG 공식 행사 페이지',
    );
    for (const [description, label] of [
      ['일정 출처: MLH 공식 행사 목록', '일정 출처 · MLH'],
      ['일정 출처: Agenda (CC BY-NC 4.0)', '일정 출처 · Agenda · CC BY-NC 4.0'],
    ]) {
      rerender(<ConferenceCard conference={{ ...conference, description }} />);
      expect(container.querySelector('.event-source summary')?.textContent).toBe(label);
      expect(container.querySelector('.event-source p')?.textContent).toBe(description);
    }
  });
});
