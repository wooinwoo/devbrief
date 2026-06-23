'use client';

import { useEffect, useState } from 'react';

/** 스크롤이 일정 이상 내려가면 우하단에 나타나는 '맨 위로' 버튼. */
export function ScrollTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }}
      aria-label="맨 위로"
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-line-strong)',
        boxShadow: 'var(--shadow-card-hover)',
        color: 'var(--color-fg-default)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
