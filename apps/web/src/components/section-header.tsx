interface Props {
  label: string;
  count?: number;
  hint?: string;
}

/** 목록 그룹의 제목과 개수를 같은 위계로 표시한다. */
export function SectionHeader({ label, count, hint }: Props) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3 pb-3 border-b border-(--color-line-strong)">
      <h3 className="text-base font-semibold leading-snug tracking-[-0.015em] text-(--color-fg-strong)">
        {label}
      </h3>
      {typeof count === 'number' && (
        <span className="text-xs tabular-nums text-(--color-fg-muted)">{count}</span>
      )}
      {hint && <span className="ml-auto text-xs text-(--color-fg-muted)">{hint}</span>}
    </div>
  );
}
