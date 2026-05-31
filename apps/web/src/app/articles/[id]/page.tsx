import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/site-nav';
import { ArticleDetail } from '@/components/article-detail';
import { MOCK_ARTICLES } from '@/lib/mock-articles';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const article = MOCK_ARTICLES.find((a) => a.id === id);
  return {
    title: article ? `${article.title} · Devbrief` : 'Devbrief',
    description: article?.summaryOneLine ?? undefined,
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params;
  const article = MOCK_ARTICLES.find((a) => a.id === id);
  if (!article) notFound();

  const related = MOCK_ARTICLES.filter(
    (a) =>
      a.id !== article.id &&
      (a.source.provider === article.source.provider ||
        a.tags.some((t) => article.tags.includes(t))),
  ).slice(0, 4);

  return (
    <main
      className="min-h-screen px-6 sm:px-10 lg:px-12 pt-12 pb-24 max-w-3xl mx-auto"
      style={{ overflowX: 'clip' }}
    >
      <SiteNav />
      <ArticleDetail article={article} related={related} />
    </main>
  );
}
