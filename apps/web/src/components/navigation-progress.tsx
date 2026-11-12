'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/** 이 사이트 안으로 이동하는 클릭인지. 새 창·다운로드·외부 주소·같은 화면은 기다릴 일이 없다. */
export function isInternalNavigation(event: MouseEvent, current: URL): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  const anchor = (event.target as Element | null)?.closest?.('a');
  if (!anchor?.href || anchor.hasAttribute('download')) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  const next = new URL(anchor.href, current);
  if (next.origin !== current.origin) return false;
  return next.pathname !== current.pathname || next.search !== current.search;
}

/**
 * 링크를 누른 뒤 다음 화면이 늦게 오면 맨 위에 얇은 진행 막대를 보인다.
 * 미리 받아 둔 화면은 바로 바뀌어 막대가 나타나기 전에 사라진다.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [pending, setPending] = useState(false);

  // 주소가 바뀌면 이동이 끝난 것이다.
  useEffect(() => setPending(false), [pathname, search]);

  useEffect(() => {
    // 캡처 단계에서 본다. 버블 단계에서는 Link 가 이미 preventDefault 를 불러 구분할 수 없다.
    const onClick = (event: MouseEvent) => {
      if (isInternalNavigation(event, new URL(window.location.href))) setPending(true);
    };
    // 뒤로 가기 캐시에서 되살아난 페이지는 떠날 때 켜 둔 막대를 그대로 가지고 온다.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return pending ? <div className="nav-progress" aria-hidden="true" /> : null;
}
