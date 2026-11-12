import { SiteNav } from '@/components/site-nav';

/**
 * 상세 페이지를 여는 동안 보이는 자리. 누르는 즉시 이 화면으로 넘어가고, 글 데이터가 오면 내용이 채워진다.
 * 레이아웃은 상세 페이지와 같아서 내용이 들어와도 화면이 밀리지 않는다. 뼈대는 늦어질 때만 나타난다.
 */
export function DetailLoading({ label }: { label: string }) {
  const bar = (width: string, height = 14) => (
    <span
      className="block rounded-md animate-pulse"
      style={{ width, height, background: 'var(--color-bg-sunken)' }}
    />
  );
  return (
    <main
      id="main-content"
      className="min-h-screen w-full max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32"
    >
      <div className="nav-progress" aria-hidden="true" />
      <SiteNav />
      <div className="loading-reveal max-w-[48rem] mx-auto pt-2 sm:pt-5" aria-busy="true">
        <p className="sr-only" role="status">
          {label} 불러오는 중
        </p>
        <div className="mb-5 min-h-11 flex items-center">{bar('6rem', 13)}</div>
        <div className="mb-8 grid gap-4">
          {bar('14rem', 12)}
          {bar('92%', 30)}
          {bar('70%', 30)}
          {bar('55%', 15)}
        </div>
        <div className="grid gap-3">
          {bar('100%')}
          {bar('96%')}
          {bar('98%')}
          {bar('80%')}
        </div>
      </div>
    </main>
  );
}
