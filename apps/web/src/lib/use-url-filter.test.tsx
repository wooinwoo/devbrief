import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUrlFilters } from './use-url-filter';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});
describe('URL filter updates', () => {
  it('cancels a pending search when its screen unmounts', () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useUrlFilters());
    act(() => hook.result.current.setParamDebounced('q', 'React'));
    hook.unmount();
    act(() => vi.advanceTimersByTime(250));
    expect(window.location.search).toBe('');
  });
  it('preserves filters changed before a pending search debounce finishes', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/?tab=articles');
    const hook = renderHook(() => useUrlFilters());
    act(() => hook.result.current.setParamDebounced('q', 'React'));
    act(() => hook.result.current.setParam('source', 'geeknews'));
    hook.rerender();
    act(() => vi.advanceTimersByTime(250));
    expect(new URLSearchParams(window.location.search).get('source')).toBe('geeknews');
    expect(new URLSearchParams(window.location.search).get('q')).toBe('React');
  });
  it('does not resurrect a cleared search from a queued debounce', () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useUrlFilters());
    act(() => hook.result.current.setParamDebounced('q', 'React'));
    act(() => hook.result.current.setParam('q', null));
    act(() => vi.advanceTimersByTime(250));
    expect(new URLSearchParams(window.location.search).has('q')).toBe(false);
  });
  it('merges two filter changes made in the same event', () => {
    const hook = renderHook(() => useUrlFilters());
    act(() => {
      hook.result.current.setParam('source', 'geeknews');
      hook.result.current.setParam('cat', 'ai');
    });
    expect(new URLSearchParams(window.location.search).get('source')).toBe('geeknews');
    expect(new URLSearchParams(window.location.search).get('cat')).toBe('ai');
  });
});
