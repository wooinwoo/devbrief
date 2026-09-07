'use server';

import { ADMIN_COOKIE, SESSION_TTL_MS, checkPassword, issueSessionToken } from '@/lib/admin-auth';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLoginBlocked, recordLoginFailure } from './rate-limit';

/** 프록시 뒤에서 클라이언트 IP 추출 (x-forwarded-for 첫 항목). */
async function clientIp(): Promise<string> {
  const hdrs = await headers();
  const fwd = hdrs.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || 'unknown';
}

export async function login(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const from = String(formData.get('from') ?? '/admin');

  // 시도 제한 — 차단 상태면 비밀번호 검증 자체를 건너뛴다.
  const ip = await clientIp();
  if (isLoginBlocked(ip)) {
    redirect('/admin/login?error=rate');
  }

  const ok = await checkPassword(password);
  if (!ok) {
    recordLoginFailure(ip);
    redirect('/admin/login?error=1');
  }

  // 로그인마다 고유한 HMAC 서명 토큰 발급 (만료 7일, admin-auth.ts 참고).
  const token = await issueSessionToken();
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    // 프로덕션(HTTPS)에서는 평문 HTTP 로 쿠키가 실려나가지 않게 강제.
    // 로컬 dev(http://localhost)는 secure 쿠키를 못 쓰므로 분기한다.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000, // 7일 — 토큰 자체 만료(exp)와 일치
  });

  redirect(from.startsWith('/admin') ? from : '/admin');
}

export async function logout() {
  // 서버측 세션 저장소가 없어 개별 토큰 폐기는 불가 — 쿠키만 삭제한다.
  // 토큰은 7일 뒤 자체 만료되고, 유출 의심 시 ADMIN_SESSION_SECRET
  // (미설정 시 ADMIN_PASSWORD) 회전으로 전 세션을 일괄 무효화한다.
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect('/admin/login');
}
