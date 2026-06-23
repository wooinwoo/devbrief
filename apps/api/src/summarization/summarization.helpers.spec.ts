import { clamp, cleanBody, splitSentences, topSentences } from './summarization.service';

describe('cleanBody', () => {
  it('HTML 태그와 엔티티를 제거하고 평문화한다', () => {
    expect(cleanBody('<p>안녕&nbsp;<b>세계</b></p>')).toBe('안녕 세계');
  });

  it('"기사 URL: ..." 메타줄과 단독 링크를 제거한다 (GeekNews 패턴)', () => {
    const raw = '본문 내용. 기사 URL: https://geeknews.io/x 추가 https://a.com/b';
    expect(cleanBody(raw)).toBe('본문 내용. 추가');
  });

  it('연속 공백을 하나로 접고 양끝을 trim 한다', () => {
    expect(cleanBody('  a\n\n b   c ')).toBe('a b c');
  });

  it('빈 입력/null 류는 빈 문자열', () => {
    expect(cleanBody('')).toBe('');
    expect(cleanBody(undefined as unknown as string)).toBe('');
  });
});

describe('splitSentences', () => {
  it('마침표·물음표·느낌표 뒤 공백 기준으로 문장을 나눈다', () => {
    expect(splitSentences('첫 문장. 둘째? 셋째!')).toEqual(['첫 문장.', '둘째?', '셋째!']);
  });

  it('전각 마침표(。)도 경계로 인식한다', () => {
    expect(splitSentences('日本語。 다음')).toEqual(['日本語。', '다음']);
  });

  it('구두점이 없으면 통째로 한 문장', () => {
    expect(splitSentences('구두점 없는 한 줄')).toEqual(['구두점 없는 한 줄']);
  });
});

describe('topSentences', () => {
  it('앞쪽 n개 문장만 추출한다 (각 12자 이상)', () => {
    const text =
      '첫 번째 문장은 충분히 길게 작성했습니다. 두 번째 문장도 충분히 길게 만들었습니다. 세 번째 문장 또한 길게 작성한 것입니다.';
    expect(topSentences(text, 2)).toEqual([
      '첫 번째 문장은 충분히 길게 작성했습니다.',
      '두 번째 문장도 충분히 길게 만들었습니다.',
    ]);
  });

  it('12자 미만의 짧은 조각은 버린다', () => {
    // "짧다." 는 12자 미만이라 제외, 긴 문장만 남는다
    const text = '짧다. 이것은 충분히 길이가 되는 첫 문장입니다.';
    expect(topSentences(text, 3)).toEqual(['이것은 충분히 길이가 되는 첫 문장입니다.']);
  });

  it('본문이 너무 짧으면 빈 배열', () => {
    expect(topSentences('짧음', 3)).toEqual([]);
    expect(topSentences('', 3)).toEqual([]);
  });
});

describe('clamp', () => {
  it('최대 길이를 넘으면 말줄임표를 붙인다', () => {
    expect(clamp('abcdefghij', 5)).toBe('abcde…');
  });

  it('최대 길이 이하면 그대로 두되 trim 한다', () => {
    expect(clamp('  짧은 글  ', 100)).toBe('짧은 글');
  });
});
