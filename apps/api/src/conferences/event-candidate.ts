import { kstDateLabel } from '../common/kst';
import { isBlockedHostname } from '../common/url-guard';

export interface DiscoveredConference {
  name: string;
  url: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  topics: string[];
  kind?: 'conference' | 'hackathon';
  description?: string;
}

function calendarDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : null;
}

export function canonicalEventUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      isBlockedHostname(url.hostname)
    )
      return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || /^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.search ? url.toString() : url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/** 외부 피드와 AI 응답이 공유하는 저장 경계. 날짜를 추정하거나 잘못된 값을 보정하지 않는다. */
export function normalizeEventCandidate(
  value: unknown,
  now = new Date(),
): DiscoveredConference | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.name !== 'string') return null;
  const name = row.name.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 240) return null;
  const startDate = calendarDate(row.startDate);
  const endDate = row.endDate == null || row.endDate === '' ? null : calendarDate(row.endDate);
  if (
    !startDate ||
    (row.endDate != null && row.endDate !== '' && !endDate) ||
    (endDate && endDate < startDate)
  )
    return null;
  if ((endDate ?? startDate) < kstDateLabel(now)) return null;
  const url =
    typeof row.url === 'string' && row.url.trim() ? canonicalEventUrl(row.url.trim()) : null;
  if (row.url != null && row.url !== '' && (!url || String(row.url).length > 2048)) return null;
  const topics = Array.isArray(row.topics)
    ? [
        ...new Set(
          row.topics
            .filter((t): t is string => typeof t === 'string' && !!t.trim())
            .map((t) => (/^hackathon$/i.test(t.trim()) ? 'Hackathon' : t.trim().slice(0, 64))),
        ),
      ].slice(0, 12)
    : [];
  const kind =
    row.kind === 'hackathon' || topics.includes('Hackathon') || /hackathon|해커톤/i.test(name)
      ? 'hackathon'
      : 'conference';
  if (kind === 'hackathon' && !topics.includes('Hackathon')) topics.unshift('Hackathon');
  return {
    name,
    url,
    startDate,
    endDate,
    location: typeof row.location === 'string' ? row.location.trim().slice(0, 240) || null : null,
    topics,
    kind,
    ...(typeof row.description === 'string' ? { description: row.description.slice(0, 1000) } : {}),
  };
}
