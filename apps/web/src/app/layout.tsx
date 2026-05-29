import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulse',
  description: '매일의 기술 흐름. AI가 정리하고 챗봇이 답한다.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-zinc-100">{children}</body>
    </html>
  );
}
