import type { ArticleDto } from '@/components/article-card';
import { ArticleDetail } from '@/components/article-detail';
import { LoadFailure } from '@/components/load-failure';
import { SiteNav } from '@/components/site-nav';
import { parseArticleRows } from '@/lib/article-response';
import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { MOCKS_ENABLED } from '@/lib/mocks-enabled';
import { publicRead } from '@/lib/public-read';
import { pickRelated } from '@/lib/related-articles';
import type { ArticleDetail as ArticleDetailDto, ArticleListItem } from '@devbrief/shared';
import { notFound } from 'next/navigation';

import { API_BASE } from '@/lib/api';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 와이어 형태는 @devbrief/shared 가 단일 소스 — 상세(GET /articles/:id)는 ArticleDetail,
 * related 는 ArticleListItem 이고, 둘 다 이 교집합 형태로 받아 카드 DTO 로 좁힌다 (감사 c58).
 */
type DbArticle = ArticleListItem & Partial<Pick<ArticleDetailDto, 'contentHtml'>>;

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
    contentHtml: d.contentHtml ?? null,
    source: d.source ?? { name: '출처 미상', provider: 'rss_generic' },
  };
}

async function getOne(id: string): Promise<ArticleDto | null | undefined> {
  try {
    const res = await publicRead(`${API_BASE}/articles/${id}`, {
      cache: 'no-store',
    });
    if (res.ok) return mapDbToDto(parseArticleRows([await res.json()])[0]);
    if (res.status === 404) return null;
  } catch {
    // A failed detail endpoint must not turn an existing article into a false 404.
  }
  try {
    const res = await publicRead(`${API_BASE}/articles/batch?ids=${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const articles = parseArticleRows(await res.json());
    const article = articles.find((candidate) => candidate.id === id);
    // The list payload retains the real summary and original link; no article body is fabricated.
    return article ? mapDbToDto(article) : null;
  } catch {
    return undefined;
  }
}

/**
 * 비슷한 글: 백엔드 pgvector 코사인 유사도 추천을 호출한다.
 * 개발 환경에서만 빈 응답/실패 시 MOCK_ARTICLES 에서 같은 출처/태그로 폴백한다.
 * 프로덕션은 빈 배열을 내려 섹션 자체를 숨긴다 (mock 이 유사도 추천으로 위장되면 안 됨).
 */
async function getRelated(article: ArticleDto, limit = 5): Promise<ArticleDto[]> {
  try {
    const res = await publicRead(`${API_BASE}/articles/${article.id}/related?limit=${limit}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as DbArticle[];
      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapDbToDto);
      }
    }
  } catch {
    // 네트워크 실패 → 아래 폴백.
  }
  return MOCKS_ENABLED ? pickRelated(article, MOCK_ARTICLES, limit) : [];
}

// mock 글 상세(m1~)는 개발 환경 한정 — 프로덕션은 notFound 로 떨어진다.
function findMockArticle(id: string): ArticleDto | undefined {
  return MOCKS_ENABLED ? MOCK_ARTICLES.find((a) => a.id === id) : undefined;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const fromApi = await getOne(id);
  const article = fromApi ?? findMockArticle(id);
  const heading = article?.titleKo ?? article?.title;
  return {
    title: heading ? `${heading} · Devbrief` : 'Devbrief',
    description: article?.summaryOneLine ?? undefined,
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params;
  const fromApi = await getOne(id);
  const article = fromApi ?? findMockArticle(id) ?? null;
  if (!article && fromApi === undefined)
    return (
      <main id="main-content" className="mx-auto max-w-4xl px-5">
        <SiteNav />
        <LoadFailure />
      </main>
    );
  if (!article) notFound();

  const related = await getRelated(article);

  return (
    <main
      id="main-content"
      className="min-h-screen w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32"
    >
      <SiteNav />
      <div className="max-w-[48rem] mx-auto pt-2 sm:pt-5">
        <ArticleDetail article={article} related={related} />
      </div>
    </main>
  );
}
