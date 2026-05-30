'use client';

import { relativeTime } from '@/lib/relative-time';

const SOURCE_BAR: Record<string, string> = {
  geeknews: 'oklch(48% 0.16 160)',
  hackernews: 'oklch(55% 0.18 45)',
  devto: 'oklch(48% 0.18 290)',
  techcrunch: 'oklch(50% 0.21 15)',
  anthropic: 'oklch(55% 0.17 60)',
  openai: 'oklch(50% 0.15 220)',
  producthunt: 'oklch(54% 0.20 340)',
  rss_generic: 'oklch(45% 0.012 250)',
};

export interface Citation {
  index: number;
  title: string;
  url: string;
  sourceName: string;
  sourceProvider: string;
  publishedAt: string;
  snippet?: string;
}

interface Props {
  citations: Citation[];
  highlightIndex?: number | null;
}

export function CitationGrid({ citations, highlightIndex }: Props) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-5">
      <p
        className="text-[10px] mb-3 tracking-[0.18em] uppercase"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        출처
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {citations.map((c) => {
          const bar = SOURCE_BAR[c.sourceProvider] ?? SOURCE_BAR.rss_generic;
          const isHi = highlightIndex === c.index;
          return (
            <li
              key={c.index}
              id={`cite-${c.index}`}
              className="transition-all duration-500 min-w-0"
              style={{
                background: isHi
                  ? 'linear-gradient(to right, oklch(78% 0.13 195 / 0.08), transparent)'
                  : 'transparent',
                borderRadius: 6,
                padding: 2,
              }}
            >
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative pl-3 py-1 group min-w-0"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-1 bottom-1 transition-all"
                  style={{
                    width: isHi ? 2 : 1,
                    background: bar,
                    boxShadow: isHi ? `0 0 8px ${bar}` : 'none',
                  }}
                />
                <div className="flex items-center gap-2 mb-1 text-[11px]">
                  <span style={{ color: 'var(--color-fg-subtle)' }} className="tabular-nums">
                    [{c.index}]
                  </span>
                  <span style={{ color: bar }}>{c.sourceName}</span>
                  <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                  <span style={{ color: 'var(--color-fg-muted)' }}>
                    {relativeTime(c.publishedAt)}
                  </span>
                </div>
                <p
                  className="text-[13px] leading-snug transition-colors group-hover:text-(--color-fg-strong) overflow-hidden"
                  style={{
                    color: 'var(--color-fg-default)',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    minWidth: 0,
                  }}
                >
                  {c.title}
                </p>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
