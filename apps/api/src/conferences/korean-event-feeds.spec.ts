import { parseAwskrug, parseDevKorea, parseGdgIncheon } from './korean-event-feeds';

const calendar = (fields: string[], extra = '') =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    extra,
    'BEGIN:VEVENT',
    'SUMMARY:AWSKRUG 모임',
    'URL;VALUE=URI:https://www.meetup.com/awskrug/events/123/',
    ...fields,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

const seoul = ['DTSTART;TZID=Asia/Seoul:20260910T183000', 'DTEND;TZID=Asia/Seoul:20260910T213000'];

const eventCard = (time: string, name = 'Shipaton 2026: Seoul', path = '/events/shipaton') => `
  <li>
    <a href="${path}"><img alt="${name}" /><span>Event ended</span></a>
    <time dateTime="${time}">September event</time>
    <a href="${path}"><p>${name}</p></a>
    <p>Registration closes 2026-09-30; submit your project by then.</p>
  </li>`;

describe('AWSKRUG 공개 ICS', () => {
  it('한국 시간대와 URI 매개변수를 읽고 없는 장소를 서울로 추정하지 않는다', () => {
    expect(parseAwskrug(calendar(seoul))).toEqual([
      expect.objectContaining({
        name: 'AWSKRUG 모임',
        url: 'https://www.meetup.com/awskrug/events/123/',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
        location: '대한민국 · 장소는 공식 안내 확인',
        kind: 'meetup',
        topics: ['Meetup', 'AWS'],
      }),
    ]);
  });

  it('UTC의 날짜 경계를 한국 시간으로 변환한다', () => {
    expect(parseAwskrug(calendar(['DTSTART:20260910T163000Z', 'DTEND:20260910T180000Z']))).toEqual([
      expect.objectContaining({ startDate: '2026-09-11', endDate: '2026-09-11' }),
    ]);
  });

  it.each([
    ['DTSTART;VALUE=DATE:20260910', 'DTEND;VALUE=DATE:20260913', '2026-09-12'],
    [
      'DTSTART;TZID=Asia/Seoul:20260910T210000',
      'DTEND;TZID=Asia/Seoul:20260911T000000',
      '2026-09-10',
    ],
  ])('배타적인 종료일 %s / %s를 마지막 행사 날짜로 바꾼다', (start, end, endDate) => {
    expect(parseAwskrug(calendar([start, end]))).toEqual([
      expect.objectContaining({ startDate: '2026-09-10', endDate }),
    ]);
  });

  it('줄 접기·이스케이프를 복원하고 알림의 SUMMARY는 행사 제목을 덮어쓰지 않는다', () => {
    const result = parseAwskrug(
      calendar([
        ...seoul,
        'SUMMARY:AWSKRUG Dev\\, Data\\; AI',
        '  Engineering\\nMeetup',
        'LOCATION:Busan\\, Korea\\; Hall \\1',
        'DESCRIPTION:Private participant details must not be copied',
        'BEGIN:VALARM',
        'SUMMARY:Reminder',
        'END:VALARM',
      ]),
    );
    expect(result).toEqual([
      expect.objectContaining({
        name: 'AWSKRUG Dev, Data; AI Engineering\nMeetup',
        location: '대한민국 · Busan, Korea; Hall \\1',
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('Private participant');
    expect(JSON.stringify(result)).not.toContain('Reminder');
  });

  it('취소 이벤트·취소 캘린더를 수집하지 않는다', () => {
    expect(parseAwskrug(calendar([...seoul, 'STATUS:CANCELLED']))).toEqual([]);
    expect(parseAwskrug(calendar(seoul, 'METHOD:CANCEL'))).toEqual([]);
  });

  it.each([
    ['DTSTART:20260910T183000'],
    ['DTSTART;TZID=America/New_York:20260910T183000'],
    ['DTSTART;TZID=Asia/Seoul:20260230T183000'],
    ['DTSTART;TZID=Asia/Seoul:20260910T256000'],
    ['DTSTART;VALUE=DATE:20260910T183000Z'],
    [seoul[0], 'DTEND;TZID=Asia/Seoul:20260909T213000'],
    [seoul[0], 'DTEND;VALUE=DATE:20260911'],
    [seoul[0], 'DTEND:invalid'],
  ])('불명확한 시간대·잘못된 기간은 보정하지 않는다: %j', (...fields) => {
    expect(parseAwskrug(calendar(fields))).toEqual([]);
  });

  it('잘못된 응답과 지원하지 않는 반복 규칙은 실패로 알린다', () => {
    expect(() => parseAwskrug('<html>maintenance</html>')).toThrow('calendar missing');
    expect(() => parseAwskrug(calendar([...seoul, 'RRULE:FREQ=WEEKLY']))).toThrow(
      'expanded events',
    );
  });
});

describe('Dev Korea 공식 행사 목록', () => {
  it('접수 마감일·이미지 오버레이 대신 실제 행사 time과 제목 링크를 읽는다', () => {
    expect(parseDevKorea(`<ul>${eventCard('2026-09-21T07:00:00.000Z')}</ul>`)).toEqual([
      expect.objectContaining({
        name: 'Shipaton 2026: Seoul',
        url: 'https://dev-korea.com/events/shipaton',
        startDate: '2026-09-21',
        endDate: null,
        location: '대한민국 · 장소는 공식 안내 확인',
        kind: 'meetup',
        topics: ['Meetup', 'Dev Korea'],
      }),
    ]);
  });

  it('여러 일정과 HTML 엔터티를 읽고 UTC 자정 경계를 한국 날짜로 옮긴다', () => {
    expect(
      parseDevKorea(`<ul>${eventCard('2026-09-21T16:00:00Z', 'Code &amp; Share')}
      ${eventCard('2026-09-28T18:30:00+09:00', 'Accessibility, live', '/events/accessibility')}</ul>`),
    ).toEqual([
      expect.objectContaining({ name: 'Code & Share', startDate: '2026-09-22' }),
      expect.objectContaining({ name: 'Accessibility, live', startDate: '2026-09-28' }),
    ]);
  });

  it.each(['2026-02-30T07:00:00Z', '2026-09-21T07:00:00', 'not-a-date'])(
    '잘못되거나 시간대 없는 날짜는 제외한다: %s',
    (time) => {
      expect(parseDevKorea(`<ul>${eventCard(time)}</ul>`)).toEqual([]);
    },
  );

  it('행사 카드 없는 응답을 빈 수집 성공으로 처리하지 않는다', () => {
    expect(() => parseDevKorea('<html>maintenance</html>')).toThrow('event cards missing');
  });
});

const gdgPage = (results: unknown[]) =>
  `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      pageProps: {
        chapterSlug: 'gdg-incheon',
        chapterData: { country: 'KR', city: 'Incheon' },
        prerenderData: {
          upcomingEvents: { results },
          pastEvents: { results: [{ title: '지난 해커톤', start_date: '2026-09-01T01:00:00Z' }] },
        },
      },
    },
  })}</script>`;
const gdgEvent = {
  title: 'I/O Extended : Agent Field Trip 2026 Incheon',
  url: 'https://gdg.community.dev/events/details/google-gdg-incheon-presents-io-extended-agent-field-trip-2026-incheon/',
  start_date: '2026-09-12T04:00:00Z',
  event_type_title: '외부 티켓 판매(External Ticketing)',
  description_short: '노트북 앞에 앉아있는 해커톤, 이번엔 아닙니다.',
};

describe('GDG Incheon 공식 예정 목록', () => {
  it('공개 예정 목록의 실제 날짜·URL만 읽고 개최 장소와 종료일은 추정하지 않는다', () => {
    expect(parseGdgIncheon(gdgPage([gdgEvent]))).toEqual([
      expect.objectContaining({
        name: gdgEvent.title,
        url: gdgEvent.url,
        startDate: '2026-09-12',
        endDate: null,
        location: '대한민국 · 장소는 공식 안내 확인',
        kind: 'meetup',
        topics: ['Meetup', 'GDG'],
        description: expect.stringContaining('GDG Incheon'),
      }),
    ]);
  });

  it('소개글에서만 해커톤을 언급하는 모임을 해커톤으로 바꾸지 않는다', () => {
    expect(
      parseGdgIncheon(
        gdgPage([
          {
            ...gdgEvent,
            title: '해결 경험 공유',
            description_short: '해커톤 참가 후기를 공유하는 밋업',
          },
        ]),
      ),
    ).toEqual([expect.objectContaining({ kind: 'meetup', topics: ['Meetup', 'GDG'] })]);
  });

  it.each([
    [{ title: 'Incheon Hackathon' }, 'hackathon'],
    [{ event_type_title: 'Hackathon' }, 'hackathon'],
    [{ title: 'GDG Conference' }, 'conference'],
  ])('명시한 제목·등록 유형으로만 행사 유형을 구분한다: %j', (fields, kind) => {
    expect(parseGdgIncheon(gdgPage([{ ...gdgEvent, ...fields }]))).toEqual([
      expect.objectContaining({ kind }),
    ]);
  });

  it('UTC 날짜 경계를 한국 날짜로 옮기고 시간대 없는 값과 잘못된 날짜는 제외한다', () => {
    expect(
      parseGdgIncheon(
        gdgPage([
          { ...gdgEvent, start_date: '2026-09-12T16:00:00Z' },
          { ...gdgEvent, start_date: '2026-09-12T10:00:00' },
          { ...gdgEvent, start_date: '2026-02-30T10:00:00Z' },
        ]),
      ),
    ).toEqual([expect.objectContaining({ startDate: '2026-09-13' })]);
  });

  it('정상 빈 목록과 구조 변경을 구분한다', () => {
    expect(parseGdgIncheon(gdgPage([]))).toEqual([]);
    expect(() => parseGdgIncheon('<html>maintenance</html>')).toThrow('upcoming events missing');
    expect(() => parseGdgIncheon(gdgPage([]).replace('"KR"', '"US"'))).toThrow(
      'upcoming events missing',
    );
  });
});
