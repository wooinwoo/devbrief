import Link from 'next/link';

interface Props {
  total: number;
  sourceCount: number;
}

function nextNineAm(): string {
  const next = new Date();
  next.setHours(9, 0, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  const diffH = Math.round((next.getTime() - Date.now()) / (1000 * 60 * 60));
  if (diffH < 1) return '곧';
  if (diffH < 24) return `${diffH}시간 뒤`;
  return `내일 오전 9시`;
}

export function PageFooter({ total, sourceCount }: Props) {
  return (
    <footer
      className="mt-20 pt-10 grid gap-8 sm:grid-cols-[1fr_auto] items-end"
      style={{ borderTop: '1px solid var(--color-line)' }}
    >
      <div>
        <p
          className="text-[11px] mb-2 tracking-[0.2em] uppercase"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          Pulse
        </p>
        <p
          className="text-[13px] leading-relaxed max-w-md"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          매일 오전 9시 자동으로 글 / 컨퍼런스 / 발표 영상을 수집합니다. 다음 갱신{' '}
          <span style={{ color: 'var(--color-fg-default)' }}>{nextNineAm()}</span>.
        </p>
        <p
          className="text-[12px] mt-2"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          현재 인덱스 <span style={{ color: 'var(--color-fg-muted)' }}>{total}</span> 글
          <span className="mx-2">·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>{sourceCount}</span> 소스
        </p>
      </div>

      <Link
        href="/chat"
        className="inline-flex items-center gap-2 px-4 py-2 text-[13px] rounded-full transition-all self-start sm:self-end"
        style={{
          color: 'var(--color-accent)',
          border: '1px solid var(--color-line-strong)',
          background:
            'linear-gradient(to right, var(--color-accent-glow), transparent)',
        }}
      >
        <span
          aria-hidden
          className="inline-block w-1 h-1 rounded-full pulse-bar"
          style={{ background: 'var(--color-accent)' }}
        />
        지금 챗봇으로 묻기
      </Link>
    </footer>
  );
}
