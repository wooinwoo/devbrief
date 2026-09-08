import type { ConferenceDto } from './mock-conferences';

export type EventType = 'conference' | 'hackathon' | 'meetup';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  conference: '컨퍼런스',
  hackathon: '해커톤',
  meetup: '밋업·세미나',
};

/** 이전에 저장된 소문자 태그와 공식 행사명도 같은 유형으로 분류한다. */
export function eventType(event: Pick<ConferenceDto, 'name' | 'topics'>): EventType {
  if (event.topics.some((topic) => /^meetup$/i.test(topic.trim()))) return 'meetup';
  if (event.topics.some((topic) => /^hackathon$/i.test(topic.trim()))) return 'hackathon';
  if (/hackathon|해커톤/i.test(event.name)) return 'hackathon';
  if (/\bmeet[ -]?up\b|\bseminar\b|밋업|세미나/i.test(event.name)) return 'meetup';
  return 'conference';
}
