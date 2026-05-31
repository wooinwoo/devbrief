interface Props {
  label: string;
  count?: number;
  hint?: string; // 우측 작은 보조 라벨 (영어 uppercase)
}

/**
 * 잡지 톤 section 헤더 — 좌측 한글 + 굵은 보더 + 우측 영어 uppercase.
 */
export function SectionHeader({ label, count, hint }: Props) {
  return (
    <div
      className="flex items-baseline gap-3 mb-3 pt-1 border-t-2"
      style={{ borderColor: 'var(--color-fg-strong)' }}
    >
      <span
        className="text-[14px] tracking-[-0.005em] -mt-0.5"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
      >
        {label}
      </span>
      {typeof count === 'number' && (
        <span
          className="text-[11.5px] tabular-nums"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          {count}
        </span>
      )}
      <span className="flex-1" />
      {hint && (
        <span
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
