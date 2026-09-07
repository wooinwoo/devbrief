'use client';

import { useEffect, useId, useState } from 'react';

interface FilterOption {
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
  const filterId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount =
    groups.filter((g) => g.active !== null).length + (search?.value.trim() ? 1 : 0);

  return (
    <aside className="lg:w-[200px] lg:shrink-0">
      <div className="lg:sticky lg:top-24">
        {search && (
          <div className="mb-3 lg:mb-6">
            <SearchField {...search} />
          </div>
        )}
        {/* 모바일 전용 접기/펼치기 토글 */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls={filterId}
          className="lg:hidden w-full flex items-center justify-between min-h-11 px-3.5 py-2.5 mb-3 rounded-lg border text-[13.5px]"
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
            aria-hidden="true"
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
        <div id={filterId} className={`${mobileOpen ? 'flex' : 'hidden'} lg:flex flex-col gap-6`}>
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
                      className="shrink-0 min-h-11 px-1 text-[12px] hover:underline underline-offset-2"
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
                      onClick={() => g.onSelect(g.active === opt.value ? null : opt.value)}
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
      </div>
    </aside>
  );
}

/**
 * 검색 입력 — role=search 폼으로 감싸 Enter 제출을 지원한다.
 * 타이핑은 즉시 onChange 로 흘려보내 라이브 필터가 동작하고,
 * 외부에서 value 가 바뀌면(예: URL 복원/초기화) 입력값을 동기화한다.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState(value);
  // 외부 value 반영 — 단, 사용자의 타이핑이 디바운스+trim 을 거쳐 되돌아온 에코(trim 만
  // 다른 값)는 draft 를 되덮지 않는다(입력 중 후행 공백 삭제·IME 조합 끊김 방지).
  // 진짜 외부 변경(URL 복원/뒤로가기 등, trim 무관하게 다른 값)만 반영한다.
  useEffect(() => {
    setDraft((prev) => (prev.trim() === value ? prev : value));
  }, [value]);

  const label = placeholder ?? '검색';
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onChange(draft);
      }}
      className="relative"
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          // Esc 로 검색어 비우기 — 입력값이 있을 때만 가로채 다른 Esc 동작과 충돌하지 않게.
          if (e.key === 'Escape' && draft) {
            e.preventDefault();
            setDraft('');
            onChange('');
          }
        }}
        placeholder={label}
        className="w-full min-h-11 pl-3 pr-11 py-2 text-[16px] lg:text-[14px] rounded-md border outline-none transition-colors focus:border-(--color-accent)"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-line-strong)',
          color: 'var(--color-fg-strong)',
        }}
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            onChange('');
          }}
          aria-label="검색어 지우기"
          className="absolute right-0 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded transition-colors hover:bg-(--color-bg-sunken)"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M3 3L9 9M9 3L3 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </form>
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
      className="group flex items-center gap-2 min-h-11 px-2.5 py-1.5 rounded-md text-sm transition-colors lg:w-full hover:bg-(--color-bg-sunken)"
      style={{
        color: active ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
        fontWeight: active ? 700 : 500,
        background: active ? 'var(--color-bg-sunken)' : undefined,
      }}
    >
      {color && (
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: color }}
        />
      )}
      <span className="min-w-0 text-left">{label}</span>
      {typeof count === 'number' && (
        <span
          className="ml-auto tabular-nums text-xs"
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
