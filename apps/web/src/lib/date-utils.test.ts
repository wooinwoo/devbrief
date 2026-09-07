import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { daysUntil, isUpcomingEvent, nextNineAmLabel } from './date-utils';

describe('daysUntil', () => {
  beforeEach(() => {
    // 2026-06-23 14:30 KST (= 05:30 UTC) 고정 — UTC 절대시각으로 지정해 어느 TZ 에서 돌려도 동일
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T05:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 실제 API 는 date-only 를 UTC 자정('...T00:00:00.000Z')으로 직렬화한다 — 실데이터 형태로 검증
  it('진행 중인 여러 날 행사는 종료일까지 유지하고 지난 단일 행사는 제외한다', () => {
    expect(isUpcomingEvent({ startDate: '2026-06-20', endDate: '2026-06-23' })).toBe(true);
    expect(isUpcomingEvent({ startDate: '2026-06-20', endDate: '2026-06-22' })).toBe(false);
    expect(isUpcomingEvent({ startDate: '2026-06-22' })).toBe(false);
    expect(isUpcomingEvent({ startDate: '2026-06-23' })).toBe(true);
  });
  it('오늘 날짜(UTC 자정 직렬화)는 0 — KST 에서 +1 이 되던 off-by-one 회귀 가드', () => {
    expect(daysUntil('2026-06-23T00:00:00.000Z')).toBe(0);
  });

  it('내일은 1', () => {
    expect(daysUntil('2026-06-24T00:00:00.000Z')).toBe(1);
  });

  it('어제는 -1 — 지난 행사가 D-0 으로 upcoming 에 남지 않는다', () => {
    expect(daysUntil('2026-06-22T00:00:00.000Z')).toBe(-1);
  });

  it('일주일 뒤는 7', () => {
    expect(daysUntil('2026-06-30T00:00:00.000Z')).toBe(7);
  });

  it('사흘 전은 -3', () => {
    expect(daysUntil('2026-06-20T00:00:00.000Z')).toBe(-3);
  });

  it('타임존 없는 로컬 문자열도 달력 날짜만 본다', () => {
    expect(daysUntil('2026-06-23T00:00:00')).toBe(0);
  });

  it('같은 날 늦은 시각(23:59)도 0 — 시각 무시, 달력 날짜 비교가 새 의도', () => {
    expect(daysUntil('2026-06-23T23:59:00')).toBe(0);
  });

  it('KST 새벽(UTC 로는 전날)에도 KST 달력 기준으로 계산한다', () => {
    // 2026-06-23 01:00 KST = 06-22 16:00 UTC — UTC 날짜 기준이면 1 이 나오는 함정 케이스
    vi.setSystemTime(new Date('2026-06-22T16:00:00Z'));
    expect(daysUntil('2026-06-23T00:00:00.000Z')).toBe(0);
    expect(daysUntil('2026-06-24T00:00:00.000Z')).toBe(1);
  });

  it('KST 자정 직전에도 오늘/내일 경계가 정확하다', () => {
    // 2026-06-23 23:59 KST = 14:59 UTC
    vi.setSystemTime(new Date('2026-06-23T14:59:00Z'));
    expect(daysUntil('2026-06-23T00:00:00.000Z')).toBe(0);
    expect(daysUntil('2026-06-24T00:00:00.000Z')).toBe(1);
  });
});

describe('nextNineAmLabel', () => {
  it('KST 오후엔 다음날 09:00 KST 까지 남은 시간 — UTC 서버 기준 09:00 이 아니다', () => {
    // 14:30 KST → 다음 09:00 KST(=00:00 UTC)까지 18.5시간 → 반올림 19
    expect(nextNineAmLabel(new Date('2026-06-23T05:30:00Z'))).toBe('19시간 뒤');
  });

  it('09:00 KST 직전(1시간 미만)은 곧', () => {
    // 08:40 KST = 23:40 UTC → 20분 뒤
    expect(nextNineAmLabel(new Date('2026-06-22T23:40:00Z'))).toBe('곧');
  });

  it('09:00 KST 직후는 내일 오전 9시', () => {
    // 09:10 KST = 00:10 UTC → 약 23.8시간 → 반올림 24 → 내일 라벨
    expect(nextNineAmLabel(new Date('2026-06-23T00:10:00Z'))).toBe('내일 오전 9시');
  });

  it('같은 절대시각이면 항상 같은 라벨 — 서버(UTC)/클라(KST) hydration 일치 보장', () => {
    const at = new Date('2026-06-23T05:30:00Z');
    expect(nextNineAmLabel(at)).toBe(nextNineAmLabel(new Date(at.getTime())));
  });
});
