import type { Metadata } from 'next';
import './globals.css';
import { LangProvider } from '@/lib/lang-context';

export const metadata: Metadata = {
  title: 'Devbrief — 매일의 개발 브리핑',
  description:
    '한국 개발자를 위한 기술 큐레이션. 매일 09시 RSS 수집, AI 요약·번역, 컨퍼런스·발표 영상까지 한눈에.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg"
          style={{ background: 'var(--color-accent)', color: 'oklch(99% 0 0)', fontWeight: 700 }}
        >
          본문으로 건너뛰기
        </a>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
