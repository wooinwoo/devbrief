'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

/** URL-backed filters; writes merge against the latest URL, even before React renders again. */
export function useUrlFilters() {
  const searchParams = useSearchParams();
  const pending = useRef<{ key: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const setParam = useCallback((key: string, value: string | null) => {
    // An immediate clear/tag selection supersedes a pending search for the same key.
    if (pending.current?.key === key) {
      clearTimeout(pending.current.timer);
      pending.current = null;
    }
    const url = new URL(window.location.href);
    if (value === null || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, value);
    // Native history changes synchronize Next/vinext without refetching the server page.
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current.timer);
    },
    [],
  );

  const setParamDebounced = useCallback(
    (key: string, value: string | null, ms = 250) => {
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = {
        key,
        timer: setTimeout(() => {
          pending.current = null;
          setParam(key, value);
        }, ms),
      };
    },
    [setParam],
  );

  return { searchParams, setParam, setParamDebounced };
}
