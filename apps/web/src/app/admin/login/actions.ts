'use server';

import { ADMIN_COOKIE, checkPassword, sessionToken } from '@/lib/admin-auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const from = String(formData.get('from') ?? '/admin');

  const ok = await checkPassword(password);
  if (!ok) {
    redirect('/admin/login?error=1');
  }

  const token = await sessionToken();
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30일
  });

  redirect(from.startsWith('/admin') ? from : '/admin');
}

export async function logout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect('/admin/login');
}
