'use client';

import Link from 'next/link';
import { relativeTime } from '@/lib/relative-time';

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

const SOURCE_TONE: Record<string, string> = {
  geeknews: 'text-emerald-300',
  hackernews: 'text-orange-300',
  devto: 'text-violet-300',
  techcrunch: 'text-rose-300',
  anthropic: 'text-amber-300',
  openai: 'text-sky-300',
  producthunt: 'text-pink-300',
  rss_generic: 'text-zinc-400',
};

interface Props {
  article: ArticleDto;
  read?: boolean;
  onOpen?: () => void;
  onTagClick?: (tag: string) => void;
}

export function ArticleCard({ article, read = false, onOpen, onTagClick }: Props) {
  const tone = SOURCE_TONE[article.source.provider] ?? 'text-zinc-400';
  const summary = article.summaryOneLine;
  const askUrl = `/chat?q=${encodeURIComponent(`${article.title} 에 대해 설명해줘`)}`;

  return (
    <article
      className={`group relative pl-4 -ml-4 pb-8 border-b border-zinc-900 transition-all
        hover:border-zinc-700
        ${read ? 'opacity-50 hover:opacity-80' : ''}
      `}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-8 w-px bg-transparent group-hover:bg-zinc-500 transition-colors"
      />

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:rounded-md"
      >
        <div className="flex items-center gap-2 mb-2 text-xs tracking-wide">
          <span className={tone}>{article.source.name}</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500">{relativeTime(article.publishedAt)}</span>
          {!read && (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="안 본 글" />
          )}
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold leading-snug tracking-tight transition-colors group-hover:text-zinc-50">
          {article.title}
        </h2>
        {summary && <p className="text-zinc-400 mt-3 leading-relaxed">{summary}</p>}
      </a>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        {article.tags.slice(0, 6).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTagClick?.(t)}
            className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            #{t}
          </button>
        ))}
        <span className="flex-1" />
        <Link
          href={askUrl}
          className="text-xs text-zinc-500 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
        >
          <span className="inline-block w-1 h-1 rounded-full bg-emerald-400" aria-hidden />
          챗봇에 묻기
        </Link>
      </div>
    </article>
  );
}
