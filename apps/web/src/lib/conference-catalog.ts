import { API_BASE } from './api';
import type { ConferenceDto } from './mock-conferences';

class CatalogResponseError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delay);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/** Recover transient read failures without making visitors restart the event tab. */
export async function fetchConferenceCatalog(signal: AbortSignal): Promise<ConferenceDto[]> {
  for (let attempt = 0; ; attempt += 1) {
    signal.throwIfAborted();
    try {
      const response = await fetch(`${API_BASE}/conferences?upcoming=1&limit=1000`, {
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(35_000)]),
      });
      if (!response.ok) {
        throw new CatalogResponseError(
          'Event collection unavailable',
          response.status >= 500 || response.status === 408 || response.status === 429,
        );
      }
      const rows = await response.json();
      if (!Array.isArray(rows)) {
        throw new CatalogResponseError('Invalid event collection', false);
      }
      signal.throwIfAborted();
      return rows.map((row) => ({ ...row, brand: row.brandColor ?? undefined }));
    } catch (error) {
      signal.throwIfAborted();
      if (attempt >= 2 || (error instanceof CatalogResponseError && !error.retryable)) {
        throw error;
      }
      await waitForRetry(attempt === 0 ? 500 : 1500, signal);
    }
  }
}
