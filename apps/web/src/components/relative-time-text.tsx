'use client';

import { relativeTime } from '@/lib/relative-time';
import { useEffect, useState } from 'react';

interface Props {
  iso: string;
  className?: string;
}

/**
 * 상대시간 텍스트 — hydration 안전 래퍼.
 * 렌더 중 Date.now() 를 쓰는 relativeTime 은 SSR 시각과 hydration 시각이
 * 분/시간 경계를 넘으면 텍스트가 어긋난다('59분 전' vs '1시간 전').
 * suppressHydrationWarning 만으로는 부족 — mismatch 시 React 가 fiber 에
 * 클라이언트 값을 기록해 이후 재렌더가 bail 되고 서버의 낡은 텍스트가 DOM 에 남는다.
 * 그래서 마운트 후 key 를 바꿔 요소를 새로 만들어 클라이언트 기준 값으로 확정한다.
 */
export function RelativeTimeText({ iso, className }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <time
      key={mounted ? 'client' : 'ssr'}
      dateTime={iso}
      className={className}
      suppressHydrationWarning
    >
      {relativeTime(iso)}
    </time>
  );
}
