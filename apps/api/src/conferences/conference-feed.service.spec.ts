import axios from 'axios';
import { ConferenceFeedService, parseAgenda, parseMlh } from './conference-feed.service';
import { canonicalEventUrl, normalizeEventCandidate } from './event-candidate';

jest.mock('axios');
const NOW = new Date('2026-09-07T04:00:00Z');
const candidate = {
  name: '  Seoul   Hackathon ',
  url: 'https://example.com/event?utm_source=feed#top',
  startDate: '2026-09-10',
  endDate: '2026-09-12',
  location: '서울',
  topics: ['AI', 'AI'],
};
const agenda = JSON.stringify([
  {
    name: 'Future Conf',
    date: [Date.parse('2026-09-10'), Date.parse('2026-09-12')],
    hyperlink: 'https://example.com/conf',
    location: 'Seoul',
    status: 'open',
    tags: [{ key: 'tech', value: 'Python' }],
  },
]);
const mlh = (rows: unknown[]) =>
  `<script data-page="app" type="application/json">${JSON.stringify({ props: { upcomingEvents: rows } })}</script>`;
const hack = {
  name: 'HackRice',
  startsAt: '2026-09-11T20:00:00Z',
  endsAt: '2026-09-13T19:00:00Z',
  url: '/events/hackrice',
  websiteUrl: 'https://hackrice.com/',
  formatType: 'digital',
  status: 'pending',
};
const awskrug = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'SUMMARY:AWSKRUG Meetup',
  'URL;VALUE=URI:https://www.meetup.com/awskrug/events/123/',
  'DTSTART;TZID=Asia/Seoul:20260910T183000',
  'DTEND;TZID=Asia/Seoul:20260910T213000',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');
const devKorea =
  '<ul><li><time datetime="2026-09-21T07:00:00Z"></time><a href="/events/shipaton">Shipaton 2026: Seoul</a></li></ul>';
const gdgIncheon = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: {
    pageProps: {
      chapterSlug: 'gdg-incheon',
      chapterData: { country: 'KR' },
      prerenderData: {
        upcomingEvents: {
          results: [
            {
              title: 'Incheon Hackathon',
              url: 'https://gdg.community.dev/events/details/incheon-hackathon/',
              start_date: '2026-09-12T04:00:00Z',
            },
          ],
        },
      },
    },
  },
})}</script>`;

describe('행사 저장 경계', () => {
  it('이름에 해커톤이 없어도 피드의 소문자 태그로 유형을 구분한다', () => {
    expect(
      normalizeEventCandidate(
        { ...candidate, name: '237HackFest', topics: ['hackathon', 'Hackathon'] },
        NOW,
      ),
    ).toEqual(expect.objectContaining({ kind: 'hackathon', topics: ['Hackathon'] }));
  });
  it('공백·추적 URL·중복 태그를 정리하고 해커톤을 구분한다', () => {
    expect(normalizeEventCandidate(candidate, NOW)).toEqual(
      expect.objectContaining({
        name: 'Seoul Hackathon',
        url: 'https://example.com/event',
        topics: ['Hackathon', 'AI'],
        kind: 'hackathon',
      }),
    );
  });
  it.each([
    null,
    {},
    { ...candidate, endDate: false },
    { ...candidate, endDate: 0 },
    { ...candidate, startDate: '2026-02-30' },
    { ...candidate, endDate: '2026-09-09' },
    { ...candidate, endDate: 'unknown' },
    { ...candidate, url: 'javascript:alert(1)' },
    { ...candidate, url: 'http://127.0.0.1/event' },
    { ...candidate, url: 'https://user:pass@example.com/' },
  ])('잘못된 후보는 저장하지 않는다: %p', (row) => {
    expect(normalizeEventCandidate(row, NOW)).toBeNull();
  });
  it('진행 중인 행사는 남기고 종료된 행사는 제외한다', () => {
    expect(
      normalizeEventCandidate(
        { ...candidate, startDate: '2026-09-01', endDate: '2026-09-07' },
        NOW,
      ),
    ).not.toBeNull();
    expect(
      normalizeEventCandidate(
        { ...candidate, startDate: '2026-09-01', endDate: '2026-09-06' },
        NOW,
      ),
    ).toBeNull();
  });
  it('진짜 행사 식별 쿼리는 보존한다', () => {
    expect(canonicalEventUrl('https://example.com/?event=123&utm_medium=rss&next=path/')).toBe(
      'https://example.com/?event=123&next=path%2F',
    );
  });
});

describe('공개 행사 피드', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.resetAllMocks();
  });
  afterEach(() => jest.useRealTimers());
  it('Agenda 날짜 범위·주제·출처를 매핑한다', () => {
    expect(parseAgenda(agenda)).toEqual([
      expect.objectContaining({
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        topics: ['Python'],
        description: expect.stringContaining('CC BY-NC 4.0'),
      }),
    ]);
  });
  it('MLH 공식 URL·온라인 표시·해커톤 유형을 매핑한다', () => {
    expect(parseMlh(mlh([hack]))).toEqual([
      expect.objectContaining({
        url: 'https://hackrice.com/',
        startDate: '2026-09-11',
        endDate: '2026-09-13',
        location: '온라인',
        kind: 'hackathon',
      }),
    ]);
  });
  it('취소된 행사는 제외하고 잘못된 응답 스키마는 실패로 구분한다', () => {
    expect(parseMlh(mlh([{ ...hack, status: 'cancelled' }]))).toEqual([]);
    expect(() => parseAgenda('{}')).toThrow();
    expect(() => parseMlh('<html>maintenance</html>')).toThrow();
  });
  it('한 소스가 실패해도 다른 소스 수집은 유지한다', async () => {
    (axios.get as jest.Mock)
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ data: mlh([hack]) })
      .mockResolvedValueOnce({ data: awskrug })
      .mockResolvedValueOnce({ data: devKorea })
      .mockResolvedValueOnce({ data: gdgIncheon });
    const result = await new ConferenceFeedService().collect();
    expect(result[0].error).toBe('timeout');
    expect(result[1].candidates).toHaveLength(1);
    expect(result[1].error).toBeUndefined();
    expect(result.slice(2)).toEqual([
      expect.objectContaining({
        source: 'AWSKRUG',
        candidates: [expect.objectContaining({ kind: 'meetup', topics: ['Meetup', 'AWS'] })],
      }),
      expect.objectContaining({
        source: 'Dev Korea',
        candidates: [expect.objectContaining({ kind: 'meetup', startDate: '2026-09-21' })],
      }),
      expect.objectContaining({
        source: 'GDG Incheon',
        candidates: [expect.objectContaining({ kind: 'hackathon', startDate: '2026-09-12' })],
      }),
    ]);
    expect(result.slice(1).every((source) => source.error === undefined)).toBe(true);
    expect((axios.get as jest.Mock).mock.calls.map(([url]) => url)).toEqual([
      'https://developers.events/all-events.json',
      'https://www.mlh.com/events',
      'https://www.meetup.com/awskrug/events/ical/',
      'https://dev-korea.com/events',
      'https://gdg.community.dev/gdg-incheon/',
    ]);
  });
  it('현실에 없는 날짜·불명확한 종료일이 파서를 거쳐도 저장되지 않는다', async () => {
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({ data: '[]' })
      .mockResolvedValueOnce({
        data: mlh([
          { ...hack, startsAt: '2026-02-30T12:00:00Z' },
          { ...hack, endsAt: 'invalid' },
        ]),
      })
      .mockResolvedValueOnce({ data: awskrug })
      .mockResolvedValueOnce({ data: devKorea })
      .mockResolvedValueOnce({ data: gdgIncheon });
    const result = await new ConferenceFeedService().collect();
    expect(result[1].candidates).toEqual([]);
    expect(result[1].skipped).toBe(2);
  });
  it('국내 소스의 구조 변경도 개별 오류로 남기고 정상 소스는 유지한다', async () => {
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({ data: agenda })
      .mockResolvedValueOnce({ data: mlh([hack]) })
      .mockResolvedValueOnce({ data: '<html>maintenance</html>' })
      .mockResolvedValueOnce({ data: devKorea })
      .mockResolvedValueOnce({ data: '<html>maintenance</html>' });
    const result = await new ConferenceFeedService().collect();
    expect(result[2]).toEqual({
      source: 'AWSKRUG',
      candidates: [],
      skipped: 0,
      error: 'AWSKRUG calendar missing',
    });
    expect(result[0].candidates).toHaveLength(1);
    expect(result[1].candidates).toHaveLength(1);
    expect(result[3].candidates).toHaveLength(1);
    expect(result[4].error).toBe('GDG Incheon upcoming events missing');
  });
});
