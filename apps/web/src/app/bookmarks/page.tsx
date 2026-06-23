import { BookmarksView } from '@/components/bookmarks-view';
import { SiteNav } from '@/components/site-nav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '저장한 글 · Devbrief',
  description: '북마크한 개발 글을 한곳에서 모아 봅니다.',
};

export default function BookmarksPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen w-full px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 pb-24"
    >
      <SiteNav />
      <BookmarksView />
    </main>
  );
}
