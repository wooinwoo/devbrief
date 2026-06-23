import { login } from './actions';

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error, from } = await searchParams;

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--color-bg-sunken)' }}
    >
      <div
        className="w-full max-w-[380px] rounded-2xl border p-8 sm:p-10"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-line)',
          boxShadow: '0 12px 40px -12px oklch(0% 0 0 / 0.12)',
        }}
      >
        {/* 로고 + 타이틀 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <span
              className="text-[13px] tracking-[0.28em] uppercase"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
            >
              Devbrief
            </span>
            <span
              className="text-[9px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded"
              style={{
                color: 'var(--color-accent)',
                background: 'oklch(80% 0.12 60 / 0.16)',
                fontWeight: 700,
              }}
            >
              Admin
            </span>
          </div>
          <h1
            className="text-[1.5rem] leading-tight tracking-[-0.02em] mb-1.5"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            로그인
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            관리자 비밀번호를 입력하세요.
          </p>
        </div>

        <form action={login} className="flex flex-col gap-3">
          <input type="hidden" name="from" value={from ?? '/admin'} />

          <label className="flex flex-col gap-1.5">
            <span
              className="text-[12px]"
              style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}
            >
              비밀번호
            </span>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              required
              className="px-3.5 py-3 text-[14px] rounded-lg border outline-none transition-all focus:ring-2"
              style={{
                background: 'var(--color-bg-base)',
                borderColor: error ? 'oklch(60% 0.2 25)' : 'var(--color-line-strong)',
                color: 'var(--color-fg-strong)',
              }}
            />
          </label>

          {error && (
            <p
              className="flex items-center gap-1.5 text-[12.5px]"
              style={{ color: 'oklch(55% 0.2 25)' }}
            >
              <span aria-hidden>⚠</span> 비밀번호가 올바르지 않습니다.
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
          className="mt-7 pt-5 text-center text-[11.5px] border-t"
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
