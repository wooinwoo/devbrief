import type { Metadata } from 'next';
import './globals.css';
import { JsonLd } from '@/components/json-ld';
import { NavigationProgress } from '@/components/navigation-progress';
import { LangProvider } from '@/lib/lang-context';
import { SITE_URL } from '@/lib/site';
import { Suspense } from 'react';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // "./"는 현재 경로로 풀려 페이지마다 자기 canonical과 og:url을 갖는다.
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Devbrief',
    url: './',
    images: [{ url: '/og.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: { url: '/brand-mark.svg?v=brief-mark-5', type: 'image/svg+xml', sizes: 'any' },
    shortcut: '/favicon.ico?v=brief-mark-5',
    apple: '/apple-touch-icon.png?v=brief-mark-5',
  },
  title: 'Devbrief — 매일의 개발 브리핑',
  description:
    '한국 개발자를 위한 기술 큐레이션. 매일 09시 RSS 수집, AI 요약·번역, 컨퍼런스·발표 영상까지 한눈에.',
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Devbrief',
  url: `${SITE_URL}/`,
  inLanguage: 'ko-KR',
  description:
    '한국 개발자를 위한 기술 큐레이션. 개발 뉴스 요약·번역, 발표 영상, 오픈소스와 개발 행사 일정.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <JsonLd data={websiteJsonLd} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg"
          style={{ background: 'var(--color-accent)', color: 'oklch(99% 0 0)', fontWeight: 700 }}
        >
          본문으로 건너뛰기
        </a>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
