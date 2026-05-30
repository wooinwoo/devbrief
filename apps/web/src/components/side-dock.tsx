'use client';

import Link from 'next/link';
import { SourceRing } from './source-ring';
import { MOCK_CONFERENCES } from '@/lib/mock-conferences';
import { useChat } from './chat-context';

interface Props {
  total: number;
  sources: Array<{ provider: string; name: string; count: number }>;
}

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function SideDock({ total, sources }: Props) {
  const chat = useChat();
  const upcoming = MOCK_CONFERENCES.filter((c) => daysUntil(c.startDate) >= 0)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  return (
    <aside className="space-y-10">
      {/* 도넛 */}
      <section>
        <p
          className="text-[10px] mb-4 tracking-[0.2em] uppercase"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          소스 분포
        </p>
        <SourceRing sources={sources} total={total} />
      </section>

      {/* 컨퍼런스 */}
      <section>
        <div className="flex items-baseline gap-3 mb-4">
          <p
            className="text-[10px] tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            다가오는 컨퍼런스
          </p>
          <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
          <Link
            href="/conferences"
            className="text-[10px] tracking-wide transition-colors"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            <span className="hover:text-(--color-fg-strong) transition-colors">전체 →</span>
          </Link>
        </div>
        <ul className="space-y-4">
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
                      boxShadow: isNear ? '0 0 6px var(--color-warm)' : 'none',
                    }}
                  />
                  <div className="text-[11px] mb-1 tabular-nums tracking-wide">
                    <span
                      style={{ color: isNear ? 'var(--color-warm)' : 'var(--color-fg-muted)' }}
                    >
                      {d === 0 ? '오늘' : `D-${d}`}
                    </span>
                  </div>
                  <p
                    className="text-[13px] leading-snug transition-colors group-hover:text-(--color-fg-strong)"
                    style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}
                  >
                    {c.name}
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    {c.location}
                  </p>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 챗봇 빠른 진입 */}
      <section>
        <div className="flex items-baseline gap-3 mb-3">
          <p
            className="text-[10px] tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            빠른 질문
          </p>
          <span className="flex-1 h-px" style={{ background: 'var(--color-line)' }} />
        </div>
        <ul className="space-y-1.5">
          {[
            '오늘 핵심만 3줄로',
            'AI 모델 출시 모음',
            '내가 안 본 글 큐레이션',
          ].map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => chat?.ask(p)}
                className="text-left text-[12px] py-1.5 w-full transition-colors"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                <span className="hover:text-(--color-fg-strong) transition-colors">
                  → {p}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
