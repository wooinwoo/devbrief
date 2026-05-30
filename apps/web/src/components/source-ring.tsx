interface Slice {
  provider: string;
  name: string;
  count: number;
  color: string;
}

const SOURCE_COLOR: Record<string, string> = {
  geeknews: 'oklch(55% 0.17 160)',
  hackernews: 'oklch(60% 0.18 45)',
  devto: 'oklch(55% 0.18 290)',
  techcrunch: 'oklch(55% 0.21 15)',
  anthropic: 'oklch(62% 0.17 60)',
  openai: 'oklch(58% 0.15 220)',
  producthunt: 'oklch(60% 0.20 340)',
  rss_generic: 'oklch(55% 0.012 250)',
};

interface Props {
  sources: Array<{ provider: string; name: string; count: number }>;
  total: number;
}

export function SourceRing({ sources, total }: Props) {
  const size = 140;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const slices: Slice[] = sources.map((s) => ({
    ...s,
    color: SOURCE_COLOR[s.provider] ?? 'oklch(60% 0.01 250)',
  }));

  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`전체 ${total}개 글의 소스 분포`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={stroke}
          />
          {slices.map((s) => {
            const portion = s.count / total;
            const dash = portion * circumference;
            const offset = -((acc / total) * circumference);
            acc += s.count;
            return (
              <circle
                key={s.provider}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-[1.75rem] leading-none tabular-nums"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 500 }}
          >
            {total}
          </span>
          <span
            className="text-[10px] mt-1 tracking-[0.15em] uppercase"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            글
          </span>
        </div>
      </div>

      <ul className="space-y-1.5 text-xs">
        {slices.map((s) => (
          <li key={s.provider} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-(--color-fg-muted)">{s.name}</span>
            <span className="text-(--color-fg-subtle)">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
