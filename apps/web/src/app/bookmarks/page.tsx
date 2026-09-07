import { BookmarksView } from '@/components/bookmarks-view';
import { PageFooter } from '@/components/page-footer';
import { SiteNav } from '@/components/site-nav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '저장한 글 · Devbrief',
  description: '북마크한 개발 글을 한곳에서 모아 봅니다.',
};

export default function BookmarksPage() {
  return (
    <main id="main-content" className="library-page">
      <SiteNav />
      <BookmarksView />
      <PageFooter />
    </main>
  );
}
