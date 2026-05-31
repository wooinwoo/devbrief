import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyToken } from '@/lib/admin-auth';

// /admin/* 전체 보호 (로그인 페이지 제외).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 로그인 페이지는 통과
  if (pathname === '/admin/login') return NextResponse.next();

  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const ok = await verifyToken(token);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
