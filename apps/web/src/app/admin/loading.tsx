/** 관리자 화면을 여는 동안 보이는 자리. 공개 사이트의 상단바와 문구를 보이지 않는다. */
export default function Loading() {
  return (
    <main id="main-content" className="min-h-screen">
      <div className="nav-progress" aria-hidden="true" />
      <p className="sr-only" role="status">
        관리자 화면을 불러오는 중
      </p>
    </main>
  );
}
