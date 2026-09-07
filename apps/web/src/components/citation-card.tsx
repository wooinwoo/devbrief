'use client';

import { RelativeTimeText } from './relative-time-text';

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
  idPrefix: string;
  highlightIndex?: number | null;
}

export function CitationGrid({ citations, highlightIndex, idPrefix }: Props) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="text-[14px] font-semibold mb-3" style={{ color: 'var(--color-fg-strong)' }}>
        출처
      </p>
      <ul className="border-t border-(--color-line) divide-y divide-(--color-line)">
        {citations.map((c) => {
          const isHi = highlightIndex === c.index;
          return (
            <li
              key={c.index}
              id={`${idPrefix}-cite-${c.index}`}
              className="transition-colors duration-300 min-w-0"
              style={{
                background: isHi ? 'var(--color-accent-soft)' : 'transparent',
              }}
            >
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-2 py-4 group min-w-0 hover:bg-(--color-bg-sunken) transition-colors"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2 text-[13px]">
                  <span style={{ color: 'var(--color-fg-subtle)' }} className="tabular-nums">
                    [{c.index}]
                  </span>
                  <span style={{ color: 'var(--color-fg-default)' }}>{c.sourceName}</span>
                  <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                  <span style={{ color: 'var(--color-fg-muted)' }}>
                    <RelativeTimeText iso={c.publishedAt} />
                  </span>
                </div>
                <p
                  className="text-[15px] leading-relaxed transition-colors group-hover:underline underline-offset-4 overflow-hidden"
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
