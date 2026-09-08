import * as cheerio from 'cheerio';
import { kstDateLabel } from '../common/kst';

const KST_OFFSET = 9 * 60 * 60 * 1000;
const KOREA_LOCATION = '대한민국 · 장소는 공식 안내 확인';

interface IcsField {
  value: string;
  params: Record<string, string>;
}

function unescapeText(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_, escaped: string) =>
    /n/i.test(escaped) ? '\n' : escaped,
  );
}

/** 지원하는 공개 피드의 DATE, UTC, Asia/Seoul만 해석한다. 불명확한 시간대는 추정하지 않는다. */
function calendarTime(field: IcsField | undefined) {
  if (!field) return null;
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(field.value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, utc] = match;
  const date = `${year}-${month}-${day}`;
  const civil = Date.parse(`${date}T${hour ?? '00'}:${minute ?? '00'}:${second ?? '00'}Z`);
  if (!Number.isFinite(civil) || new Date(civil).toISOString().slice(0, 10) !== date) return null;
  if (hour && (+hour > 23 || +minute > 59 || +second > 59)) return null;
  const allDay = !hour;
  if (field.params.VALUE && field.params.VALUE !== (allDay ? 'DATE' : 'DATE-TIME')) return null;
  const zone = field.params.TZID;
  if (allDay) return { instant: civil, date, allDay };
  if (utc && zone) return null;
  const offset =
    utc || zone === 'UTC' || zone === 'Etc/UTC' ? 0 : zone === 'Asia/Seoul' ? KST_OFFSET : null;
  if (offset === null) return null;
  const instant = civil - offset;
  return { instant, date: kstDateLabel(new Date(instant)), allDay };
}

/** Meetup이 공개한 단건 VEVENT만 읽는다. 행사 설명·참가자 정보는 복제하지 않는다. */
export function parseAwskrug(text: string): unknown[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  if (!/^BEGIN:VCALENDAR\r?$/m.test(unfolded) || !/^END:VCALENDAR\r?$/m.test(unfolded)) {
    throw new Error('AWSKRUG calendar missing');
  }
  if (/^METHOD:CANCEL\r?$/im.test(unfolded)) return [];
  return [...unfolded.matchAll(/^BEGIN:VEVENT\r?\n([\s\S]*?)^END:VEVENT\r?$/gm)].flatMap(
    ([, block]) => {
      const fields = new Map<string, IcsField>();
      let nested = 0;
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith('BEGIN:')) {
          nested++;
          continue;
        }
        if (line.startsWith('END:')) {
          nested--;
          continue;
        }
        if (nested) continue;
        const colon = line.indexOf(':');
        if (colon < 0) continue;
        const [key, ...parameters] = line.slice(0, colon).split(';');
        const params: Record<string, string> = {};
        for (const parameter of parameters) {
          const equal = parameter.indexOf('=');
          if (equal > 0)
            params[parameter.slice(0, equal).toUpperCase()] = parameter
              .slice(equal + 1)
              .replace(/^"|"$/g, '');
        }
        fields.set(key.toUpperCase(), { value: line.slice(colon + 1), params });
      }
      if (fields.get('STATUS')?.value.toUpperCase() === 'CANCELLED') return [];
      if (fields.has('RRULE')) throw new Error('AWSKRUG recurrence rules require expanded events');
      const start = calendarTime(fields.get('DTSTART'));
      const end = calendarTime(fields.get('DTEND'));
      if (
        !start ||
        (fields.has('DTEND') &&
          (!end || end.allDay !== start.allDay || end.instant <= start.instant))
      )
        return [];
      // RFC 5545 DTEND는 배타적이다. 자정에 끝나는 행사를 다음 날짜까지 노출하지 않는다.
      const endDate = !end
        ? null
        : end.allDay
          ? new Date(end.instant - 1).toISOString().slice(0, 10)
          : kstDateLabel(new Date(end.instant - 1));
      const location = unescapeText(fields.get('LOCATION')?.value ?? '').trim();
      return [
        {
          name: unescapeText(fields.get('SUMMARY')?.value ?? ''),
          url: unescapeText(fields.get('URL')?.value ?? ''),
          startDate: start.date,
          endDate,
          location: location ? `대한민국 · ${location}` : KOREA_LOCATION,
          kind: 'meetup',
          topics: ['Meetup', 'AWS'],
          description:
            '일정 출처: AWS한국사용자모임(AWSKRUG) 공개 캘린더. https://www.meetup.com/awskrug/events/ · 참가 신청과 장소는 공식 행사 페이지에서 확인하세요.',
        },
      ];
    },
  );
}

function koreanIsoDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))
    return null;
  const day = value.slice(0, 10);
  const calendar = Date.parse(`${day}T00:00:00Z`);
  const instant = new Date(value);
  if (
    !Number.isFinite(calendar) ||
    new Date(calendar).toISOString().slice(0, 10) !== day ||
    !Number.isFinite(instant.getTime())
  )
    return null;
  return kstDateLabel(instant);
}

/** 주최자 일정 카드의 time만 사용한다. 소개글의 접수 마감일이나 실행 스크립트는 해석하지 않는다. */
export function parseDevKorea(html: string): unknown[] {
  const $ = cheerio.load(html);
  const cards = $('li').filter((_, element) => $(element).find('time[datetime]').length > 0);
  if (!cards.length) throw new Error('Dev Korea event cards missing');
  return cards.toArray().flatMap((element) => {
    const card = $(element);
    const link = card.find('a[href^="/events/"]').last();
    const path = link.attr('href');
    const startDate = koreanIsoDate(card.find('time[datetime]').first().attr('datetime') ?? '');
    if (!path || !startDate) return [];
    return [
      {
        name: link.text().trim(),
        url: new URL(path, 'https://dev-korea.com').href,
        startDate,
        endDate: null,
        location: KOREA_LOCATION,
        kind: 'meetup',
        topics: ['Meetup', 'Dev Korea'],
        description:
          '일정 출처: Dev Korea 공식 행사 목록. https://dev-korea.com/events · 참가 신청과 장소는 공식 행사 페이지에서 확인하세요.',
      },
    ];
  });
}

/** 인천 챕터의 공개 예정 목록만 읽는다. 소개글의 해커톤 언급은 행사 유형으로 쓰지 않는다. */
export function parseGdgIncheon(html: string): unknown[] {
  const $ = cheerio.load(html);
  const data = JSON.parse($('#__NEXT_DATA__').text() || 'null');
  const page = data?.props?.pageProps;
  const rows: unknown = page?.prerenderData?.upcomingEvents?.results;
  if (
    page?.chapterSlug !== 'gdg-incheon' ||
    page?.chapterData?.country !== 'KR' ||
    !Array.isArray(rows)
  )
    throw new Error('GDG Incheon upcoming events missing');
  return rows.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Record<string, unknown>;
    const startDate = koreanIsoDate(typeof row.start_date === 'string' ? row.start_date : '');
    if (!startDate) return [];
    const label = [row.event_type_title, row.title].filter((v) => typeof v === 'string').join(' ');
    const kind = /hackathon|해커톤/i.test(label)
      ? 'hackathon'
      : /conference|컨퍼런스/i.test(label)
        ? 'conference'
        : 'meetup';
    return [
      {
        name: row.title,
        url: row.url,
        startDate,
        endDate: null,
        location: KOREA_LOCATION,
        kind,
        topics:
          kind === 'hackathon'
            ? ['Hackathon', 'GDG']
            : kind === 'meetup'
              ? ['Meetup', 'GDG']
              : ['GDG'],
        description:
          '일정 출처: GDG Incheon 공식 예정 행사 목록. https://gdg.community.dev/gdg-incheon/ · 참가 신청과 개최 방식·장소는 공식 행사 페이지에서 확인하세요.',
      },
    ];
  });
}
