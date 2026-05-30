'use client';

interface Props {
  text: string;
  onCitationClick?: (index: number) => void;
}

// 답변 텍스트에서 [1] [2] [10] 같은 패턴을 찾아 인터랙티브 chip 으로 치환.
export function AnswerText({ text, onCitationClick }: Props) {
  const parts: Array<string | { index: number; raw: string }> = [];
  const re = /\[(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ index: Number(m[1]), raw: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return (
    <p
      className="whitespace-pre-wrap break-words text-[15px] leading-relaxed"
      style={{ color: 'var(--color-fg-default)', overflowWrap: 'anywhere' }}
    >
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onCitationClick?.(p.index)}
            className="inline-flex items-center justify-center mx-0.5 align-baseline tabular-nums text-[11px] rounded-md transition-all"
            style={{
              minWidth: 22,
              padding: '0 6px',
              height: 18,
              color: 'var(--color-accent)',
              border: '1px solid var(--color-line-strong)',
              background: 'oklch(78% 0.13 195 / 0.06)',
            }}
          >
            {p.index}
          </button>
        ),
      )}
    </p>
  );
}
