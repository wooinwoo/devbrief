'use client';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  color?: string; // 좌측 dot 색 (소스/토픽 구분)
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  active: string | null;
  onSelect: (value: string | null) => void;
}

interface Props {
  groups: FilterGroup[];
  /** 좌측 상단 검색창 (선택) */
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  /** 맨 위 추가 토글 (예: 본 글 가리기) */
  extra?: React.ReactNode;
}

/**
 * 각 탭 좌측에 붙는 필터 사이드바.
 * 모바일에선 가로 스크롤 칩으로 fallback.
 */
export function FilterSidebar({ groups, search, extra }: Props) {
  return (
    <aside className="lg:w-[210px] lg:shrink-0">
      {/* 모바일: 가로 칩 / 데스크탑: 세로 sticky */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-20">
        {search && (
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? '검색'}
            className="w-full px-3 py-2 text-[13px] rounded-lg border outline-none transition-colors focus:border-(--color-accent)"
            style={{
              background: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-line-strong)',
              color: 'var(--color-fg-strong)',
            }}
          />
        )}

        {groups.map((g) => (
          <div key={g.key}>
            <div
              className="text-[10px] tracking-[0.18em] uppercase mb-2 px-1"
              style={{ color: 'var(--color-fg-subtle)', fontWeight: 600 }}
            >
              {g.label}
            </div>
            <div className="flex flex-wrap lg:flex-col gap-1">
              <FilterButton
                active={g.active === null}
                onClick={() => g.onSelect(null)}
                label="전체"
              />
              {g.options.map((opt) => (
                <FilterButton
                  key={opt.value}
                  active={g.active === opt.value}
                  onClick={() =>
                    g.onSelect(g.active === opt.value ? null : opt.value)
                  }
                  label={opt.label}
                  count={opt.count}
                  color={opt.color}
                />
              ))}
            </div>
          </div>
        ))}

        {extra && <div>{extra}</div>}
      </div>
    </aside>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 px-2 py-1.5 rounded text-[12.5px] transition-colors lg:w-full hover:bg-(--color-bg-sunken)"
      style={{
        color: active ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
        fontWeight: active ? 700 : 500,
      }}
    >
      {color && (
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: color }}
        />
      )}
      <span className="truncate">{label}</span>
      {typeof count === 'number' && (
        <span
          className="ml-auto tabular-nums text-[11px]"
          style={{
            color: active ? 'var(--color-accent)' : 'var(--color-fg-subtle)',
            fontWeight: active ? 700 : 500,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
