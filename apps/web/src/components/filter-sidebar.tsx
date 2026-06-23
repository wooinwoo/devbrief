'use client';

import { useState } from 'react';

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
  /** 사이드바 하단 위젯 영역 */
  footer?: React.ReactNode;
}

/**
 * 각 탭 좌측에 붙는 필터 사이드바.
 * 모바일에선 가로 스크롤 칩으로 fallback.
 */
export function FilterSidebar({ groups, search, extra, footer }: Props) {
  // 모바일에선 접힌 상태가 기본 — 필터가 본문을 한참 밀어내지 않게.
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount =
    groups.filter((g) => g.active !== null).length +
    (search && search.value.trim() ? 1 : 0);

  return (
    <aside className="lg:w-[210px] lg:shrink-0">
      {/* 모바일 전용 접기/펼치기 토글 */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="lg:hidden w-full flex items-center justify-between px-3.5 py-2.5 mb-3 rounded-lg border text-[13.5px]"
        style={{
          borderColor: 'var(--color-line-strong)',
          background: 'var(--color-bg-elevated)',
          color: 'var(--color-fg-strong)',
          fontWeight: 600,
        }}
      >
        <span className="flex items-center gap-2">
          필터
          {activeCount > 0 && (
            <span
              className="tabular-nums text-[11px] px-1.5 py-px rounded-full"
              style={{
                background: 'var(--color-accent)',
                color: 'oklch(99% 0 0)',
                fontWeight: 700,
              }}
            >
              {activeCount}
            </span>
          )}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className="transition-transform"
          style={{ transform: mobileOpen ? 'rotate(180deg)' : undefined }}
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 모바일: 토글로 열림 / 데스크탑: 항상 세로 sticky */}
      <div
        className={`${mobileOpen ? 'flex' : 'hidden'} lg:flex flex-col gap-6 lg:sticky lg:top-20`}
      >
        {search && (
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? '검색'}
            aria-label={search.placeholder ?? '검색'}
            className="w-full px-3 py-2 text-[13px] rounded-lg border outline-none transition-colors focus:border-(--color-accent)"
            style={{
              background: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-line-strong)',
              color: 'var(--color-fg-strong)',
            }}
          />
        )}

        {groups
          .filter((g) => g.options.length > 0)
          .map((g) => (
          <div key={g.key}>
            {/* 그룹 헤더: 라벨(위계 1순위) + 필터 적용 시에만 해제 링크 */}
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <span
                className="text-[12.5px] tracking-[-0.005em]"
                style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
              >
                {g.label}
              </span>
              {g.active !== null && (
                <button
                  type="button"
                  onClick={() => g.onSelect(null)}
                  className="shrink-0 text-[11px] hover:underline underline-offset-2"
                  style={{ color: 'var(--color-accent)', fontWeight: 600 }}
                >
                  전체 보기
                </button>
              )}
            </div>
            <div className="flex flex-wrap lg:flex-col gap-1">
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
        {footer}
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
      aria-pressed={active}
      className="group flex items-center gap-2 px-2 py-1.5 rounded text-[12.5px] transition-colors lg:w-full hover:bg-(--color-bg-sunken)"
      style={{
        color: active ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
        fontWeight: active ? 700 : 500,
        background: active ? 'var(--color-accent-soft)' : undefined,
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
