import type { CSSProperties } from 'react';
const paths = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Z',
  calendar: 'M8 2v4M16 2v4M3 10h18M4 4h16v18H4V4Z',
  play: 'm9 5 11 7-11 7V5Z',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  code: 'm8 6-6 6 6 6M16 6l6 6-6 6m-3-14-2 16',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
  spark: 'm12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z',
};
export function BriefIcon({
  name,
  size = 20,
  style,
}: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
