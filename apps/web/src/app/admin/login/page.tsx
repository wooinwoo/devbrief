import { login } from './actions';

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error, from } = await searchParams;

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="text-[12px] tracking-[0.3em] uppercase mb-2"
            style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
          >
            Pulse
          </div>
          <h1
            className="text-[1.5rem] tracking-[-0.02em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            어드민 로그인
          </h1>
        </div>

        <form action={login} className="flex flex-col gap-3">
          <input type="hidden" name="from" value={from ?? '/admin'} />
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            autoFocus
            required
            className="px-3.5 py-2.5 text-[14px] outline-none rounded border focus:border-(--color-accent) transition-colors"
            style={{ borderColor: 'var(--color-line-strong)' }}
          />
          {error && (
            <p
              className="text-[12.5px]"
              style={{ color: 'oklch(55% 0.2 25)' }}
            >
              비밀번호가 올바르지 않습니다.
            </p>
          )}
          <button
            type="submit"
            className="px-4 py-2.5 text-[14px] rounded transition-opacity hover:opacity-90"
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
          className="mt-6 text-center text-[11.5px]"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          1인 운영 어드민 · 가공 결과만 메인에 노출됩니다
        </p>
      </div>
    </main>
  );
}
