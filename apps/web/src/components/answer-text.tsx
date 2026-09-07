'use client';

interface Props {
  text: string;
  citationIndices: number[];
  onCitationClick?: (index: number) => void;
}

// 답변 텍스트에서 [1] [2] [10] 같은 패턴을 찾아 인터랙티브 chip 으로 치환.
export function AnswerText({ text, citationIndices, onCitationClick }: Props) {
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
      className="max-w-[75ch] whitespace-pre-wrap break-words text-[16px] leading-[1.8]"
      style={{ color: 'var(--color-fg-default)', overflowWrap: 'anywhere' }}
    >
      {parts.map((p, i) =>
        typeof p === 'string' || !citationIndices.includes(p.index) ? (
          <span key={i}>{typeof p === 'string' ? p : p.raw}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onCitationClick?.(p.index)}
            aria-label={`출처 ${p.index} 보기`}
            className="inline-flex items-center justify-center mx-0.5 align-baseline tabular-nums text-[12px] rounded transition-colors hover:bg-(--color-accent-soft)"
            style={{
              minWidth: 24,
              padding: '0 6px',
              height: 24,
              color: 'var(--color-accent)',
              border: '1px solid var(--color-line-strong)',
              background: 'var(--color-accent-soft)',
            }}
          >
            {p.index}
          </button>
        ),
      )}
    </p>
  );
}
