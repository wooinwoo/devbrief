// Worker용 axios 대체 모듈. Worker에는 XMLHttpRequest·node http가 없어서 fetch로 같은 모양을 만든다.
// 영상 RSS 동기화가 쓰는 create().get(url, { params, responseType, timeout })만 지원한다.
interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  responseType?: 'text' | 'json';
  timeout?: number;
  headers?: Record<string, string>;
}

function create(defaults: { timeout?: number } = {}) {
  return {
    async get<T>(url: string, options: RequestOptions = {}): Promise<{ data: T; status: number }> {
      const target = new URL(url);
      for (const [key, value] of Object.entries(options.params ?? {})) {
        if (value !== undefined) target.searchParams.set(key, String(value));
      }
      const response = await fetch(target, {
        headers: { 'user-agent': 'Mozilla/5.0 devbrief-feed', ...options.headers },
        signal: AbortSignal.timeout(options.timeout ?? defaults.timeout ?? 15_000),
      });
      if (!response.ok) throw new Error(`Request failed with status code ${response.status}`);
      const data = options.responseType === 'text' ? await response.text() : await response.json();
      return { data: data as T, status: response.status };
    },
  };
}

const axios = { create, ...create() };
export default axios;
