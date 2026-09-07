// 기사 URL 정규화 — 중복 판정 키 겸 저장값으로 사용한다.
// 같은 글이 피드마다 트래킹 파라미터/해시/트레일링 슬래시만 다른 URL 로 실려
// 중복 저장 + 요약/임베딩 이중 과금되는 것을 막는다.
//
// 보수적으로만 손댄다:
// - 트래킹 파라미터(utm_*, fbclid, gclid 등)만 제거 — 의미 있는 쿼리는 보존
// - 프래그먼트(#...) 제거
// - 트레일링 슬래시 제거 (루트 '/' 는 유지)
// - 호스트 소문자화는 URL 파서가 자동 수행
// - 스킴 통일(http→https)은 하지 않는다 — http 전용 사이트 링크가 깨질 수 있음

const TRACKING_PARAM = /^(utm_[a-z0-9_]*|fbclid|gclid|igshid|mc_cid|mc_eid)$/i;

export function normalizeArticleUrl(raw: string): string {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // URL 형식이 아니면 그대로 반환 (기존 동작 보존)
    return trimmed;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return trimmed;

  url.hash = '';

  // 삭제 중 이터레이터가 깨지지 않게 키 스냅샷 후 제거
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  if ([...url.searchParams.keys()].length === 0) url.search = '';

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }

  return url.toString();
}
