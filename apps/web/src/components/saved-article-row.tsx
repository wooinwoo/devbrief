'use client';
import { pickTitle, useLang } from '@/lib/lang-context';
import Link from 'next/link';
import type { ArticleDto } from './article-card';
import { BriefIcon } from './brief-icon';
import { CoverImage } from './cover-image';
import { RelativeTimeText } from './relative-time-text';
export function SavedArticleRow({
  article,
  read,
  onBookmark,
  onToggleRead,
  onTagClick,
}: {
  article: ArticleDto;
  read: boolean;
  onBookmark: (id: string) => void;
  onToggleRead: (id: string) => void;
  onTagClick: (tag: string) => void;
}) {
  const { lang } = useLang();
  const { primary, secondary } = pickTitle(article, lang);
  return (
    <li className="saved-article">
      <div className="saved-article-main">
        {article.imageUrl && (
          <div className="saved-article-cover">
            <CoverImage src={article.imageUrl} label={article.source.name} />
          </div>
        )}
        <div className="saved-article-copy">
          <div className="saved-article-meta text-[13px]">
            <span>{article.source.name}</span>
            <span>
              <RelativeTimeText iso={article.publishedAt} />
            </span>
            <span className={read ? 'reading-status is-read' : 'reading-status'}>
              {read ? '읽음' : '안 읽음'}
            </span>
          </div>
          <Link href={`/articles/${article.id}`}>
            <h2 className="text-[20px]">{primary}</h2>
          </Link>
          {(article.summaryOneLine || secondary) && (
            <p className="text-[16px]">{article.summaryOneLine || secondary}</p>
          )}
        </div>
      </div>
      <div className="saved-article-bottom">
        <div className="saved-tags">
          {article.tags.slice(0, 3).map((tag) => (
            <button type="button" key={tag} onClick={() => onTagClick(tag)}>
              #{tag}
            </button>
          ))}
        </div>
        <div className="saved-actions">
          <button type="button" onClick={() => onToggleRead(article.id)}>
            <BriefIcon name={read ? 'undo' : 'check'} size={17} />
            {read ? '안 읽음으로 표시' : '읽음으로 표시'}
          </button>
          <button type="button" onClick={() => onBookmark(article.id)}>
            <BriefIcon name="bookmark" size={17} />
            저장 해제
          </button>
        </div>
      </div>
    </li>
  );
}
