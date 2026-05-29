import Link from 'next/link';
import { ArticlesView } from '@/components/articles-view';
import type { ArticleDto } from '@/components/article-card';
import { MOCK_ARTICLES } from '@/lib/mock-articles';

async function getArticles(): Promise<ArticleDto[]> {
  try {
    const res = await fetch('http://localhost:4000/api/v1/articles?limit=30', {
      cache: 'no-store',
    });
    if (!res.ok) return MOCK_ARTICLES;
    const data = (await res.json()) as ArticleDto[];
    return data.length > 0 ? data : MOCK_ARTICLES;
  } catch {
    return MOCK_ARTICLES;
  }
}

export default async function Home() {
  const articles = await getArticles();
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <main className="min-h-screen px-6 sm:px-10 lg:px-16 pt-12 pb-24 max-w-6xl mx-auto">
      <header className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 tracking-widest uppercase">Pulse</p>
          <Link
            href="/chat"
            className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors tracking-wide inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-600"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            챗봇으로 묻기
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold leading-tight tracking-tight">
          오늘의 기술 흐름
        </h1>
        <p className="text-zinc-500 mt-2 text-sm">{today}</p>
      </header>

      <ArticlesView articles={articles} />
    </main>
  );
}
