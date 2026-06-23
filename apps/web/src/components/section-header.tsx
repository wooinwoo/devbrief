interface Props {
  label: string;
  count?: number;
  hint?: string; // 우측 작은 보조 라벨 (영어 uppercase)
}

/**
 * 하위 섹션(시간 그룹 등) 헤더 — overview 큰 섹션 헤더와 같은 언어(accent 바 + count pill),
 * 한 단계 작은 위계. 우측 영어 hint 보조 라벨.
 */
export function SectionHeader({ label, count, hint }: Props) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span
        aria-hidden
        className="inline-block w-1 h-4 rounded-full"
        style={{ background: 'var(--color-accent)' }}
      />
      <h3
        className="text-[1rem] leading-none tracking-[-0.015em]"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
      >
        {label}
      </h3>
      {typeof count === 'number' && (
        <span
          className="text-[11.5px] tabular-nums px-1.5 py-0.5 rounded-full"
          style={{
            color: 'var(--color-fg-muted)',
            background: 'var(--color-bg-sunken)',
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
      <span className="flex-1" />
      {hint && (
        <span
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: 'var(--color-fg-subtle)', fontWeight: 600 }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
