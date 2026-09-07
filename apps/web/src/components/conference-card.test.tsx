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
  it('keeps an event identity when no official image is available', () => {
    const { container } = render(<ConferenceCard conference={conference} />);
    expect(container.querySelector('.cover-label')?.textContent).toBe('Rust Conf');
    expect(container.querySelector('img')).toBeNull();
  });
  it('keeps the image frame after failure and retries a newly supplied URL', () => {
    const { container, rerender } = render(
      <ConferenceCard conference={{ ...conference, imageUrl: 'https://event.test/broken.png' }} />,
    );
    const image = container.querySelector('img')!;
    const frame = image.parentElement;
    fireEvent.error(image);
    expect(container.querySelector('img')).toBeNull();
    expect(frame?.isConnected).toBe(true);
    rerender(
      <ConferenceCard conference={{ ...conference, imageUrl: 'https://event.test/fixed.png' }} />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://event.test/fixed.png',
    );
  });
});
