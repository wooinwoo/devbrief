'use client';

import { relativeTime } from '@/lib/relative-time';
import { Highlight } from './highlight';
import { useChat } from './chat-context';

export interface ArticleDto {
  id: string;
  title: string;
  url: string;
  summaryOneLine: string | null;
  summaryThreeLine: string | null;
  publishedAt: string;
  tags: string[];
  source: { name: string; provider: string };
}

const SOURCE_BAR: Record<string, string> = {
  geeknews: 'oklch(75% 0.15 160)',
  hackernews: 'oklch(75% 0.16 50)',
  devto: 'oklch(72% 0.16 290)',
  techcrunch: 'oklch(72% 0.18 15)',
  anthropic: 'oklch(80% 0.14 70)',
  openai: 'oklch(75% 0.13 220)',
  producthunt: 'oklch(74% 0.17 340)',
  rss_generic: 'oklch(60% 0.01 250)',
};

interface Props {
  article: ArticleDto;
  read?: boolean;
  onOpen?: () => void;
  onTagClick?: (tag: string) => void;
  query?: string;
}

export function ArticleCard({
  article,
  read = false,
  onOpen,
  onTagClick,
  query = '',
}: Props) {
  const bar = SOURCE_BAR[article.source.provider] ?? SOURCE_BAR.rss_generic;
  const summary = article.summaryOneLine;
  const chat = useChat();

  return (
    <article
      className={`group relative pl-5 -ml-5 pb-7 transition-all duration-300 motion-safe:hover:-translate-y-px
        ${read ? 'opacity-55 hover:opacity-90' : ''}
      `}
    >
      {/* baseline 좌측 라인 (항상 보임, 약하게) */}
      <span
        aria-hidden
        className="absolute left-0 top-1 bottom-7 w-px"
        style={{ background: 'var(--color-line-strong)' }}
      />
      {/* hover 시 source 색 라인 + 글로우 */}
      <span
        aria-hidden
        className="absolute left-0 top-1 bottom-7 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(to bottom, ${bar} 0%, ${bar} 50%, transparent 100%)`,
          boxShadow: `0 0 10px ${bar}`,
        }}
      />

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        className="block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--color-line-strong) focus-visible:rounded"
      >
        <div className="flex items-center gap-2 mb-2.5 text-[12px]">
          <span style={{ color: bar }} className="tracking-wide">
            {article.source.name}
          </span>
          <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
          <span style={{ color: 'var(--color-fg-muted)' }}>{relativeTime(article.publishedAt)}</span>
          {!read && (
            <span
              aria-label="안 본 글"
              className="ml-1 inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: bar, boxShadow: `0 0 6px ${bar}` }}
            />
          )}
        </div>
        <h2
          className="text-[1.1875rem] sm:text-[1.3125rem] leading-[1.35] tracking-[-0.005em] transition-colors"
          style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}
        >
          <span className="group-hover:text-(--color-fg-strong) transition-colors">
            <Highlight text={article.title} query={query} />
          </span>
        </h2>
        {summary && (
          <p
            className="mt-2.5 leading-[1.6] text-[14px]"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            <Highlight text={summary} query={query} />
          </p>
        )}
      </a>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {article.tags.slice(0, 4).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTagClick?.(t)}
            className="text-[11px] transition-colors"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            <span className="hover:text-(--color-fg-default)">#{t}</span>
          </button>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => chat?.ask(`${article.title} 에 대해 설명해줘`)}
          className="text-[11px] inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: bar }}
        >
          <span
            aria-hidden
            className="inline-block w-1 h-1 rounded-full"
            style={{ background: bar }}
          />
          챗봇에 묻기
        </button>
      </div>
    </article>
  );
}
