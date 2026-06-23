'use client';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** 현재 페이지 주변 + 처음/끝을 보여주고 사이는 '…' 으로 생략 */
function pageItems(cur: number, total: number): (number | '…')[] {
  const set = new Set<number>([1, total, cur - 1, cur, cur + 1]);
  const arr = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const p of arr) {
    if (p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  const items = pageItems(page, totalPages);

  const arrow = (label: string, to: number, disabled: boolean) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(to)}
      aria-label={label === '‹' ? '이전 페이지' : '다음 페이지'}
      className="min-w-9 h-9 px-2 rounded-md text-[13px] transition-colors disabled:opacity-35 disabled:cursor-not-allowed enabled:hover:bg-(--color-bg-sunken)"
      style={{
        color: 'var(--color-fg-muted)',
        border: '1px solid var(--color-line)',
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );

  return (
    <nav className="flex items-center justify-center gap-1.5 pt-10 pb-2" aria-label="페이지">
      {arrow('‹', page - 1, page <= 1)}
      {items.map((it, i) =>
        it === '…' ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="min-w-9 h-9 inline-flex items-center justify-center text-[13px]"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            aria-current={it === page ? 'page' : undefined}
            className="min-w-9 h-9 rounded-md text-[13px] tabular-nums transition-colors"
            style={
              it === page
                ? {
                    background: 'var(--color-accent)',
                    color: 'oklch(99% 0 0)',
                    fontWeight: 700,
                  }
                : {
                    color: 'var(--color-fg-default)',
                    border: '1px solid var(--color-line)',
                    fontWeight: 600,
                  }
            }
          >
            {it}
          </button>
        ),
      )}
      {arrow('›', page + 1, page >= totalPages)}
    </nav>
  );
}
