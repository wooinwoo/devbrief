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
    <div
      className="rounded-xl p-5"
      style={{
        border: '1px solid var(--color-line)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full pulse-bar"
          style={{
            background: 'var(--color-accent)',
            boxShadow: '0 0 8px var(--color-accent)',
          }}
        />
        <p
          className="text-[11px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Pulse 챗봇
        </p>
      </div>

      <InlineChat ref={ref} />

      {/* 다가오는 컨퍼런스 미리보기 */}
      <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-line)' }}>
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
        <ul className="space-y-3">
          {upcoming.map((c) => {
            const d = daysUntil(c.startDate);
            const isNear = d <= 30;
            return (
              <li key={c.id}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group relative pl-3"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-0.5 bottom-0.5 w-px"
                    style={{
                      background: isNear
                        ? 'linear-gradient(to bottom, var(--color-warm), transparent)'
                        : 'var(--color-line-strong)',
                      boxShadow: isNear ? '0 0 4px var(--color-warm)' : 'none',
                    }}
                  />
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className="tabular-nums tracking-wide"
                      style={{
                        color: isNear
                          ? 'var(--color-warm)'
                          : 'var(--color-fg-muted)',
                      }}
                    >
                      D-{d}
                    </span>
                    <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                    <span
                      className="text-[12px] transition-colors"
                      style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}
                    >
                      <span className="group-hover:text-(--color-fg-strong)">
                        {c.name}
                      </span>
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
