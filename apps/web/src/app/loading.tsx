import { SiteNav } from '@/components/site-nav';

/**
 * 서버가 피드를 받아오는 동안 보이는 자리. 머리띠는 실제 화면과 같아서 내용이 들어와도 바뀌지 않는다.
 * 목록 뼈대는 금방 끝나는 로딩에서는 나타나지 않고, API 콜드 스타트처럼 늦어질 때만 보인다.
 */
export default function Loading() {
  return (
    <main
      id="main-content"
      className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12"
    >
      <div className="nav-progress" aria-hidden="true" />
      <SiteNav />
      <div className="page-loading loading-reveal" role="status" aria-busy="true">
        <p className="sr-only">브리핑을 불러오고 있어요.</p>
        <div className="skeleton-line page-loading-lead" />
        <div className="page-loading-columns">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      </div>
    </main>
  );
}
