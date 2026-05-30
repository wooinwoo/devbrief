import { ArticlesView } from '@/components/articles-view';
import { SiteNav } from '@/components/site-nav';
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
    <main
      className="min-h-screen px-6 sm:px-10 lg:px-16 xl:px-24 pt-12 pb-24 mx-auto"
      style={{ overflowX: 'clip' }}
    >
      <SiteNav />
      <header className="mb-10">
        <h1
          className="text-3xl sm:text-4xl leading-tight tracking-tight"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 500 }}
        >
          오늘의 기술 흐름
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          {today}
        </p>
      </header>

      <ArticlesView articles={articles} />
    </main>
  );
}
