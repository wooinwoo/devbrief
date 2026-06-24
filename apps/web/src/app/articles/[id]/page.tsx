import type { ArticleDto } from '@/components/article-card';
import { ArticleDetail } from '@/components/article-detail';
import { SiteNav } from '@/components/site-nav';
import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { pickRelated } from '@/lib/related-articles';
import { notFound } from 'next/navigation';

import { API_BASE } from '@/lib/api';

interface Props {
  params: Promise<{ id: string }>;
}

interface DbArticle {
  id: string;
  title: string;
  titleKo: string | null;
  url: string;
  summaryOneLine: string | null;
  summaryThreeLine: string | null;
  publishedAt: string;
  tags: string[];
  imageUrl: string | null;
  language?: string;
  source: { name: string; provider: string };
}

function mapDbToDto(d: DbArticle): ArticleDto {
  return {
    id: d.id,
    title: d.title,
    titleKo: d.titleKo,
    url: d.url,
    summaryOneLine: d.summaryOneLine,
    summaryThreeLine: d.summaryThreeLine,
    publishedAt: d.publishedAt,
    tags: d.tags ?? [],
    imageUrl: d.imageUrl,
    language: d.language,
    source: { name: d.source.name, provider: d.source.provider },
  };
}

async function getOne(id: string): Promise<ArticleDto | null> {
  try {
    const res = await fetch(`${API_BASE}/articles/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return mapDbToDto((await res.json()) as DbArticle);
  } catch {
    return null;
  }
}

/**
 * 비슷한 글: 백엔드 pgvector 코사인 유사도 추천을 호출한다.
 * API 가 비었거나 실패하면(mock 환경 등) MOCK_ARTICLES 에서 같은 출처/태그로 폴백한다.
 */
async function getRelated(article: ArticleDto, limit = 5): Promise<ArticleDto[]> {
  try {
    const res = await fetch(`${API_BASE}/articles/${article.id}/related?limit=${limit}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as DbArticle[];
      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapDbToDto);
      }
    }
  } catch {
    // 네트워크 실패 → 아래 mock 폴백.
  }
  return pickRelated(article, MOCK_ARTICLES, limit);
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const fromApi = await getOne(id);
  const article = fromApi ?? MOCK_ARTICLES.find((a) => a.id === id);
  const heading = article?.titleKo ?? article?.title;
  return {
    title: heading ? `${heading} · Devbrief` : 'Devbrief',
    description: article?.summaryOneLine ?? undefined,
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params;
  const fromApi = await getOne(id);
  const article = fromApi ?? MOCK_ARTICLES.find((a) => a.id === id) ?? null;
  if (!article) notFound();

  const related = await getRelated(article);

  return (
    <main className="min-h-screen w-full px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32">
      <SiteNav />
      <div className="max-w-3xl mx-auto">
        <ArticleDetail article={article} related={related} />
      </div>
    </main>
  );
}
