import Link from 'next/link';
import { login } from './actions';

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error, from } = await searchParams;
  // error=rate — 시도 제한 초과(actions.ts), 그 외 값은 비밀번호 불일치.
  const errorMessage = !error
    ? null
    : error === 'rate'
      ? '로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.'
      : '비밀번호가 올바르지 않습니다.';

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center px-5 py-8"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <div className="w-full max-w-[400px] py-10">
        {/* 로고 + 타이틀 */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between gap-3 mb-10 pb-5 border-b border-(--color-line)">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-[22px] tracking-[-0.025em]"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
            >
              Devbrief
            </Link>
            <span
              className="text-[14px]"
              style={{
                color: 'var(--color-fg-muted)',
                fontWeight: 500,
              }}
            >
              Admin
            </span>
          </div>
          <h1
            className="text-[2rem] leading-tight tracking-[-0.025em] mb-3"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            로그인
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-fg-muted)' }}>
            관리자 비밀번호를 입력하세요.
          </p>
        </div>

        <form action={login} className="flex flex-col gap-3">
          <input type="hidden" name="from" value={from ?? '/admin'} />

          <label className="flex flex-col gap-1.5">
            <span
              className="text-[14px]"
              style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}
            >
              비밀번호
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
              className="px-3.5 py-3 text-[16px] rounded-lg border outline-none transition-all focus:ring-2"
              style={{
                background: 'var(--color-bg-base)',
                borderColor: error ? 'oklch(60% 0.2 25)' : 'var(--color-line-strong)',
                color: 'var(--color-fg-strong)',
              }}
            />
          </label>

          {errorMessage && (
            <p
              id="login-error"
              role="alert"
              className="flex items-center gap-1.5 text-[14px]"
              style={{ color: 'oklch(55% 0.2 25)' }}
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 px-4 py-3 text-[14px] rounded-lg transition-opacity hover:opacity-90"
            style={{
              background: 'var(--color-fg-strong)',
              color: 'oklch(99% 0 0)',
              fontWeight: 600,
            }}
          >
            로그인
          </button>
        </form>

        <p
          className="mt-7 pt-5 text-[13px] leading-relaxed border-t"
          style={{
            color: 'var(--color-fg-subtle)',
            borderColor: 'var(--color-line)',
          }}
        >
          1인 운영 어드민 · 가공 결과만 메인에 노출됩니다
        </p>
      </div>
    </main>
  );
}
