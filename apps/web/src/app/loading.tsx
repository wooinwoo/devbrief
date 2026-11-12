/** 서버가 피드를 받아오는 동안(API 콜드 스타트면 수십 초) 빈 화면 대신 판의 뼈대를 먼저 보인다. */
export default function Loading() {
  return (
    <main className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12">
      <div className="page-loading-bar">
        <span className="wordmark min-h-[60px] lg:min-h-[72px]">
          devbrief<span>.</span>
        </span>
      </div>
      <div className="page-loading" role="status">
        <p>오늘의 브리핑을 불러오고 있어요.</p>
        <div className="skeleton-line page-loading-lead" />
        <div className="page-loading-columns">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      </div>
    </main>
  );
}
