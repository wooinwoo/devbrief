import { describe, expect, it } from 'vitest';
import { eventType } from './event-type';

describe('eventType', () => {
  it('구조화된 밋업 태그와 행사명의 밋업·세미나를 구분한다', () => {
    for (const event of [
      { name: 'GDG Cloud Study', topics: [' meetup ', 'Cloud'] },
      { name: 'Builders & Brews Seoul Hackathon Kickoff', topics: ['Meetup', 'AI'] },
      { name: 'Campus Build', topics: ['Hackathon', 'Meetup'] },
      { name: 'Seoul Developer Meetup', topics: [] },
      { name: '개발자 세미나', topics: [] },
    ]) {
      expect(eventType(event)).toBe('meetup');
    }
  });

  it('기존 해커톤 판정과 일반 컨퍼런스 분류를 유지한다', () => {
    expect(eventType({ name: 'Campus Meetup', topics: ['Hackathon'] })).toBe('hackathon');
    expect(eventType({ name: '서울 해커톤', topics: [] })).toBe('hackathon');
    expect(eventType({ name: 'AI Conference', topics: ['AI'] })).toBe('conference');
  });
});
