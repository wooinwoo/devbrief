'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

/**
 * URL 쿼리 기반 필터 상태 훅 — articles/AI 탭이 같은 패턴을 공유한다.
 * 필터를 URL 쿼리에서 파생시키면 새로고침/뒤로가기/링크 공유 시 그대로 복원된다.
 */
export function useUrlFilters() {
  const searchParams = useSearchParams();

  // 현재 쿼리스트링을 복제해 한 키만 갱신한 뒤 history 를 교체한다(tab 등 다른 키 보존).
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      // 같은 화면의 상태만 바꾼다. Next/vinext가 useSearchParams를 동기화하므로
      // 서버 페이지와 이미 받은 목록을 다시 요청할 필요가 없다.
      window.history.replaceState(null, '', qs ? `/?${qs}` : '/');
    },
    [searchParams],
  );

  // 키워드는 타이핑마다 URL 을 갈아끼우면 history 가 시끄러워지니 살짝 디바운스.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    [],
  );
  const setParamDebounced = useCallback(
    (key: string, value: string | null, ms = 250) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => setParam(key, value), ms);
    },
    [setParam],
  );

  return { searchParams, setParam, setParamDebounced };
}
