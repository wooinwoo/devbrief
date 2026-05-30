import { Suspense } from 'react';
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

  return (
    <main
      className="min-h-screen px-6 sm:px-10 lg:px-16 xl:px-24 pt-12 pb-24 mx-auto"
      style={{ overflowX: 'clip' }}
    >
      <SiteNav />
      <Suspense fallback={null}>
        <ArticlesView articles={articles} />
      </Suspense>
    </main>
  );
}
