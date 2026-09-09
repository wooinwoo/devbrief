import type { ArticleListItem } from '@devbrief/shared';

/** Reject broken batches before rendering or classifying saved IDs as deleted. */
export function parseArticleRows(value: unknown): ArticleListItem[] {
  if (!Array.isArray(value)) throw new Error('Invalid article collection');
  return value.map((row) => {
    if (
      !row ||
      typeof row.id !== 'string' ||
      typeof row.title !== 'string' ||
      typeof row.url !== 'string' ||
      typeof row.publishedAt !== 'string' ||
      (row.tags != null &&
        (!Array.isArray(row.tags) || row.tags.some((tag: unknown) => typeof tag !== 'string'))) ||
      (row.source != null &&
        (typeof row.source.name !== 'string' || typeof row.source.provider !== 'string'))
    ) {
      throw new Error('Invalid article');
    }
    return {
      ...row,
      tags: row.tags ?? [],
      source: row.source ?? { name: '출처 미상', provider: 'rss_generic' },
    };
  });
}
