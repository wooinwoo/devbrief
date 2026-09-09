import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicRead } from './public-read';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('bounded public reads', () => {
  it('ends a stalled request at the deadline without waiting forever', async () => {
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(init.signal.reason));
          }),
      ),
    );
    const pending = publicRead('/api/public/articles');
    const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
    deadline.abort(new DOMException('Timed out', 'TimeoutError'));
    await assertion;
    expect(timeout).toHaveBeenCalledWith(35_000);
  });
  it('preserves caller cancellation and request options', async () => {
    const caller = new AbortController();
    const fetcher = vi.fn().mockResolvedValue(new Response('[]'));
    vi.stubGlobal('fetch', fetcher);
    await publicRead('/api/public/articles', { signal: caller.signal, cache: 'no-store' });
    const options = fetcher.mock.calls[0][1];
    expect(options.cache).toBe('no-store');
    caller.abort();
    expect(options.signal.aborted).toBe(true);
  });
});
