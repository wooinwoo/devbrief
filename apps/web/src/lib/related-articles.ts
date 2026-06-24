import type { ArticleDto } from '@/components/article-card';

/**
 * mock / 폴백용 비슷한 글 선정.
 * 백엔드 임베딩 추천이 비었거나 실패할 때, 같은 출처거나 태그가 겹치는 글을
 * 최신순(입력 순서 유지) 최대 limit 개 고른다. 기준 글 자신은 제외한다.
 */
export function pickRelated(base: ArticleDto, pool: ArticleDto[], limit: number): ArticleDto[] {
  if (limit <= 0) return [];
  return pool
    .filter(
      (a) =>
        a.id !== base.id &&
        (a.source.provider === base.source.provider || a.tags.some((t) => base.tags.includes(t))),
    )
    .slice(0, limit);
}
