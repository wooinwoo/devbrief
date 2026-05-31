interface Props {
  total: number;
  sourceCount?: number;
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

export function PageFooter({ total }: Props) {
  return (
    <footer
      className="mt-20 pt-8"
      style={{ borderTop: '1px solid var(--color-line)' }}
    >
      <p
        className="text-[13px] tracking-[-0.01em] mb-1.5"
        style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
      >
        Dev<span style={{ color: 'var(--color-accent)' }}>brief</span>
      </p>
      <p
        className="text-[12.5px] leading-relaxed max-w-md"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        매일 오전 9시에 개발 글 / 컨퍼런스 / 발표 영상을 자동 수집하고 AI 가
        한국어로 요약합니다. 다음 갱신{' '}
        <span style={{ color: 'var(--color-fg-default)' }}>{nextNineAm()}</span>.
      </p>
      <p className="text-[11.5px] mt-2" style={{ color: 'var(--color-fg-subtle)' }}>
        현재 <span style={{ color: 'var(--color-fg-muted)' }}>{total}</span>개 글
        인덱싱
      </p>
    </footer>
  );
}
