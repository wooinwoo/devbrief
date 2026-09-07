'use client';
import { useEffect } from 'react';

/** Keep the current destination visible in the horizontally scrolling mobile navigation. */
export function useVisibleNavigation(activeKey: string) {
  useEffect(() => {
    const reveal = () => {
      const current = document.querySelector<HTMLElement>('.brief-header [aria-current="page"]');
      const scroller = current?.closest<HTMLElement>('.no-scrollbar');
      if (!current || !scroller) return;
      const item = current.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      if (item.left < box.left) scroller.scrollLeft += item.left - box.left;
      else if (item.right > box.right) scroller.scrollLeft += item.right - box.right;
    };
    // The dependency also runs this after client-side tab changes.
    if (activeKey) reveal();
    window.addEventListener('resize', reveal);
    return () => window.removeEventListener('resize', reveal);
  }, [activeKey]);
}
