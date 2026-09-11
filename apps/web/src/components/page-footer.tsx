import Link from 'next/link';
export function PageFooter({ total }: { total?: number }) {
  return (
    <footer className="brief-footer">
      <div>
        <Link href="/" className="wordmark">
          devbrief<span>.</span>
        </Link>
        <p>읽고, 발견하고, 더 나은 것을 만드세요.</p>
      </div>
      <nav aria-label="하단 탐색">
        <Link href="/?tab=articles" prefetch={false}>
          개발 뉴스
        </Link>
        <Link href="/?tab=conferences" prefetch={false}>
          행사
        </Link>
        <Link href="/?tab=videos" prefetch={false}>
          발표 영상
        </Link>
        <Link href="/bookmarks">저장한 글</Link>
      </nav>
      <div className="footer-note">
        <span>© 2026 Devbrief</span>
        <span>{total ? `최근 ${total}개 글 · ` : ''}매일 오전 9시 갱신</span>
      </div>
    </footer>
  );
}
