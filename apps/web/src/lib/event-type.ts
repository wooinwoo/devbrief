import type { ConferenceDto } from './mock-conferences';

export type EventType = 'conference' | 'hackathon';

/** 이전에 저장된 소문자 태그와 공식 행사명도 같은 유형으로 분류한다. */
export function eventType(event: Pick<ConferenceDto, 'name' | 'topics'>): EventType {
  return event.topics.some((topic) => /^hackathon$/i.test(topic.trim())) ||
    /hackathon|해커톤/i.test(event.name)
    ? 'hackathon'
    : 'conference';
}
