import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RelativeTimeText } from './relative-time-text';

describe('RelativeTimeText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T12:00:00Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('time 요소로 상대시간을 렌더하고 dateTime 에 원본 ISO 를 담는다', () => {
    const { container } = render(<RelativeTimeText iso="2026-05-30T11:55:00Z" />);
    const time = container.querySelector('time');
    expect(time).not.toBeNull();
    expect(time?.getAttribute('datetime')).toBe('2026-05-30T11:55:00Z');
    expect(time?.textContent).toBe('5분 전');
  });

  it('마운트 후 현재 시각 기준으로 재계산한다 — 낡은 SSR 값이 남지 않는다', () => {
    const { container } = render(<RelativeTimeText iso="2026-05-30T11:01:00Z" />);
    expect(container.querySelector('time')?.textContent).toBe('59분 전');

    // 재렌더 시점이 경계를 넘으면 새 값으로 갱신되는지 — 시계를 밀고 리렌더 유도
    act(() => {
      vi.setSystemTime(new Date('2026-05-30T12:30:00Z'));
    });
    const { container: next } = render(<RelativeTimeText iso="2026-05-30T11:01:00Z" />);
    expect(next.querySelector('time')?.textContent).toBe('1시간 전');
  });

  it('className 을 time 요소에 전달한다', () => {
    const { container } = render(<RelativeTimeText iso="2026-05-30T11:55:00Z" className="muted" />);
    expect(container.querySelector('time')?.className).toBe('muted');
  });
});
