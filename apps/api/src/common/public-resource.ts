import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { assertPublicHttpUrl } from './url-guard';

/** Validate every redirect before requesting public page/image metadata. */
export async function fetchPublicResource<T>(
  raw: string,
  options: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  let url = raw;
  const deadline = Date.now() + (options.timeout ?? 8000);
  for (let hop = 0; hop <= 5; hop++) {
    const checked = await assertPublicHttpUrl(url);
    if (checked.username || checked.password) throw new Error('URL credentials are not allowed');
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Public resource timed out');
    const response = await axios.get<T>(checked.href, {
      ...options,
      timeout: remaining,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    if (response.status >= 300) {
      if (!response.headers.location || hop === 5) throw new Error('Invalid public redirect');
      url = new URL(response.headers.location, checked.href).href;
      continue;
    }
    return response;
  }
  throw new Error('Too many public redirects');
}
