'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { InlineChat, type InlineChatHandle } from './inline-chat';
import { MOCK_CONFERENCES } from '@/lib/mock-conferences';

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const ChatPanel = forwardRef<InlineChatHandle>(function ChatPanel(_, ref) {
  const upcoming = MOCK_CONFERENCES.filter((c) => daysUntil(c.startDate) >= 0)
    .sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )
    .slice(0, 3);

  return (
    <div>
      <InlineChat ref={ref} />

      {/* 다가오는 컨퍼런스 미리보기 */}
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-line)' }}>
        <div className="flex items-baseline gap-3 mb-3">
          <p
            className="text-[10px] tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            다가오는 컨퍼런스
          </p>
          <span
            className="flex-1 h-px"
            style={{ background: 'var(--color-line)' }}
          />
          <Link
            href="/conferences"
            className="text-[10px] tracking-wide transition-colors"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            <span className="hover:text-(--color-fg-strong)">전체 →</span>
          </Link>
        </div>
        <ul className="space-y-2">
          {upcoming.map((c) => {
            const d = daysUntil(c.startDate);
            const isNear = d <= 30;
            return (
              <li key={c.id}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group relative pl-3 pr-3 py-2.5 transition-all motion-safe:hover:-translate-y-px"
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--color-line)',
                    background: isNear
                      ? `linear-gradient(to right, oklch(58% 0.18 45 / 0.06), var(--color-bg-base) 70%)`
                      : 'var(--color-bg-base)',
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-2 bottom-2 w-[2px]"
                    style={{
                      background: isNear
                        ? 'linear-gradient(to bottom, var(--color-warm), transparent 80%)'
                        : 'var(--color-line-strong)',
                      boxShadow: isNear ? '0 0 6px var(--color-warm)' : 'none',
                    }}
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="text-[13px] transition-colors"
                      style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}
                    >
                      <span className="group-hover:text-(--color-fg-strong)">
                        {c.name}
                      </span>
                    </span>
                    <span
                      className="text-[11px] tabular-nums tracking-wide shrink-0"
                      style={{
                        color: isNear
                          ? 'var(--color-warm)'
                          : 'var(--color-fg-muted)',
                      }}
                    >
                      D-{d}
                    </span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
});
