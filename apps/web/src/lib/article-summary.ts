/** 수집 메타데이터는 독자가 읽을 수 있는 기사 요약으로 취급하지 않는다. */
export function readableSummary(text: string | null | undefined): string | null {
  const summary = text?.trim();
  return summary && !/^(?:기사|Article|Comments?|댓글)\s*URL\s*:/i.test(summary) ? summary : null;
}
