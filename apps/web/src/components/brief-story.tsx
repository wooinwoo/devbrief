'use client';
import { categoryOf } from '@/lib/category';
import { pickTitle, useLang } from '@/lib/lang-context';
import Link from 'next/link';
import type { ArticleDto } from './article-card';
import { BriefIcon } from './brief-icon';
import { CoverImage } from './cover-image';
import { RelativeTimeText } from './relative-time-text';
export function BriefStory({
  article,
  featured = false,
  saved = false,
  read = false,
  onOpen,
  onBookmark,
}: {
  article: ArticleDto;
  featured?: boolean;
  saved?: boolean;
  read?: boolean;
  onOpen?: () => void;
  onBookmark?: (id: string) => void;
}) {
  const { lang } = useLang();
  const title = pickTitle(article, lang).primary;
  const cat = categoryOf(article);
  return (
    <article className={`brief-story${featured ? ' story-featured' : ''}`}>
      <Link
        href={`/articles/${article.id}`}
        onClick={onOpen}
        className="story-cover-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        <CoverImage src={article.imageUrl} label={article.source.name} priority={featured} />
      </Link>
      <div className="story-body">
        <div className="story-meta">
          <span className="topic-chip" style={{ color: cat.color, background: cat.soft }}>
            {cat.label}
          </span>
          <span>{article.source.name}</span>
          {read && <span className="read-chip">읽음</span>}
        </div>
        <Link href={`/articles/${article.id}`} onClick={onOpen}>
          <h3>{title}</h3>
        </Link>
        {article.summaryOneLine && <p className="story-summary">{article.summaryOneLine}</p>}
        <div className="story-bottom">
          <span>
            <RelativeTimeText iso={article.publishedAt} />
          </span>
          <div className="story-actions">
            {onBookmark && (
              <button
                type="button"
                className="icon-button"
                aria-label={saved ? '북마크 해제' : '북마크'}
                aria-pressed={saved}
                onClick={() => onBookmark(article.id)}
              >
                <BriefIcon name={saved ? 'check' : 'bookmark'} size={18} />
              </button>
            )}
            <Link
              href={`/articles/${article.id}`}
              onClick={onOpen}
              className="read-link"
              aria-label={`${title} 읽기`}
            >
              읽기
              <BriefIcon name="arrow" size={17} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
