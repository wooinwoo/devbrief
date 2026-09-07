import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearch } from './global-search';
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('GlobalSearch', () => {
  it('opens with the keyboard, searches beyond loaded articles and closes with Escape', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'archive', title: 'React internals', titleKo: null, source: { name: 'Archive' } },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<GlobalSearch />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(view.getByRole('dialog')).toBeTruthy();
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'React' } });
    expect(await view.findByRole('link', { name: /React internals/ })).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toContain('/articles?limit=8&q=React');
    fireEvent.keyDown(view.getByRole('dialog'), { key: 'Escape' });
    expect(view.queryByRole('dialog')).toBeNull();
  });
  it('cancels an old request when the query changes and keeps the newer result', async () => {
    let finishOld: (value: unknown) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'new', title: 'Vue guide', source: { name: 'Docs' } }],
      });
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<GlobalSearch />);
    fireEvent.click(view.getByRole('button', { name: '개발 글 검색' }));
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'React' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal = fetchMock.mock.calls[0][1].signal;
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'Vue' } });
    expect(signal.aborted).toBe(true);
    expect(await view.findByRole('link', { name: /Vue guide/ })).toBeTruthy();
    finishOld({
      ok: true,
      json: async () => [{ id: 'old', title: 'React guide', source: { name: 'Docs' } }],
    });
    await waitFor(() => expect(view.queryByRole('link', { name: /React guide/ })).toBeNull());
  });
});
