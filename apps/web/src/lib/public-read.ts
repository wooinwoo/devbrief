/** Bound public reads, including response body parsing, while preserving caller cancellation. */
export function publicRead(url: string, init: RequestInit = {}): Promise<Response> {
  const timeout = AbortSignal.timeout(35_000);
  return fetch(url, {
    ...init,
    signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  });
}
