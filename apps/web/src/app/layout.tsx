import type { Metadata } from 'next';
import './globals.css';

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
