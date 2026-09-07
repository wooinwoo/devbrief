import { nextNineAmLabel } from '@/lib/date-utils';
import Link from 'next/link';

interface Props {
  total: number;
}

const NAV = [
  { href: '/?tab=all', label: '오늘' },
  { href: '/?tab=articles', label: '개발 뉴스' },
  { href: '/?tab=conferences', label: '행사' },
  { href: '/?tab=videos', label: '발표 영상' },
  { href: '/bookmarks', label: '저장한 글' },
];

export function PageFooter({ total }: Props) {
  return (
    <footer
      className="mt-24 mx-[calc(50%-50vw)]"
      style={{ background: 'var(--bar-bg)', color: 'var(--bar-fg-muted)' }}
    >
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-10 pb-8">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-[2fr_1fr_1fr]">
          {/* 브랜드 */}
          <div>
            <p
              className="text-[20px] tracking-[-0.02em] mb-3"
              style={{ color: 'var(--bar-fg)', fontWeight: 800 }}
            >
              Dev<span style={{ color: 'var(--bar-accent)' }}>brief</span>
            </p>
            <p className="text-sm leading-[1.7] max-w-sm">
              한국 개발자를 위한 기술 큐레이션. 매일 오전 9시에 개발 글 · 행사 · 발표 영상을 자동
              수집하고 한국어로 번역합니다.
            </p>
          </div>

          {/* 둘러보기 */}
          <nav>
            <p
              className="text-sm mb-3"
              style={{ color: 'var(--bar-fg)', fontWeight: 700, opacity: 0.7 }}
            >
              둘러보기
            </p>
            <ul className="flex flex-col gap-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="inline-flex min-h-11 items-center text-[14px] transition-colors hover:text-(--bar-accent)"
                    style={{ color: 'var(--bar-fg)', fontWeight: 500 }}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 현황 */}
          <div>
            <p
              className="text-sm mb-3"
              style={{ color: 'var(--bar-fg)', fontWeight: 700, opacity: 0.7 }}
            >
              현황
            </p>
            <dl className="flex flex-col gap-1 text-[14px]">
              {[
                ['노출 중인 글', String(total)],
                ['다음 갱신', nextNineAmLabel()],
                ['수집 주기', '매일 09:00'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt>{k}</dt>
                  <dd className="tabular-nums" style={{ color: 'var(--bar-fg)', fontWeight: 600 }}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* 하단 카피 */}
        <div
          className="mt-12 pt-6 flex items-center justify-between gap-4 flex-wrap text-[12px]"
          style={{ borderTop: '1px solid var(--bar-line)' }}
        >
          <span>© 2026 Devbrief</span>
          <span>개발 뉴스 · 행사 · 발표 영상 · 오픈소스</span>
        </div>
      </div>
    </footer>
  );
}
