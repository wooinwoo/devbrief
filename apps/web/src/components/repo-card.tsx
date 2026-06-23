'use client';

import { motion } from 'motion/react';
import type { RepoDto } from '@/lib/mock-repos';

const CATEGORY_LABEL: Record<string, string> = {
  ai: 'AI',
  web: '웹',
  infra: '인프라',
  cli: 'CLI',
  data: '데이터',
  etc: '기타',
};

function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `${n}`;
}

export function RepoCard({ repo: r, index = 0 }: { repo: RepoDto; index?: number }) {
  const periodLabel = r.period === 'weekly' ? '이번 주' : '오늘';

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1], delay: 0.03 * index }}
    >
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${r.fullName}${r.language ? `, ${r.language}` : ''} — ${periodLabel} 스타 ${r.periodStars.toLocaleString()} 증가, 총 ${r.stars.toLocaleString()} 스타. GitHub에서 새 탭으로 열기`}
        className="group block py-4 border-b transition-colors"
        style={{ borderColor: 'var(--color-line)' }}
      >
        {/* 상단: 언어 · 분야 */}
        <div className="flex items-center gap-2.5 mb-1.5 text-[11.5px]">
          {r.language && (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              <span
                aria-hidden
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: r.languageColor ?? 'var(--color-fg-subtle)' }}
              />
              {r.language}
            </span>
          )}
          <span style={{ color: 'var(--color-fg-subtle)' }}>
            {CATEGORY_LABEL[r.category] ?? '기타'}
          </span>
        </div>

        {/* 제목: owner/repo */}
        <h3 className="text-[15.5px] leading-snug tracking-[-0.01em] break-all">
          <span style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}>
            {r.owner}/
          </span>
          <span
            className="group-hover:underline underline-offset-2"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            {r.name}
          </span>
        </h3>

        {/* 설명 — 2줄 높이 고정(min-h)으로 2열 그리드의 border 라인 정렬 */}
        <p
          className="mt-1 text-[13px] leading-[1.5] break-keep min-h-[2.7em]"
          style={{
            color: 'var(--color-fg-muted)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {r.description ?? ''}
        </p>

        {/* 메타: velocity(강조) + 총 star/fork */}
        <div className="mt-2.5 flex items-center gap-4 text-[12px] tabular-nums">
          {/* velocity */}
          <span
            className="inline-flex items-center gap-1"
            style={{ color: 'var(--color-accent-strong)', fontWeight: 700 }}
          >
            <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden>
              <path
                d="M4.5 0.5L8.5 5H6V10.5H3V5H0.5L4.5 0.5Z"
                fill="currentColor"
              />
            </svg>
            +{r.periodStars.toLocaleString()}
            <span style={{ color: 'var(--color-fg-subtle)', fontWeight: 500 }}>
              {' '}
              stars · {periodLabel}
            </span>
          </span>

          {/* 총 star */}
          <span
            className="inline-flex items-center gap-1"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
              <path
                d="M5.5 0.5L6.9 3.9L10.5 4.1L7.7 6.4L8.6 9.9L5.5 7.9L2.4 9.9L3.3 6.4L0.5 4.1L4.1 3.9L5.5 0.5Z"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeLinejoin="round"
              />
            </svg>
            {fmtK(r.stars)}
          </span>

          {/* fork */}
          <span style={{ color: 'var(--color-fg-subtle)' }}>
            포크 {fmtK(r.forks)}
          </span>
        </div>
      </a>
    </motion.li>
  );
}
