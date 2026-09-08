import { describe, expect, it } from 'vitest';
import { isKoreanLocation } from './event-region';

describe('isKoreanLocation', () => {
  it('경기·용인과 주요 광역시·도 표기를 국내로 분류한다', () => {
    const locations = [
      '경기도 용인시 카카오 AI 캠퍼스',
      '용인시',
      '인천광역시',
      '대구광역시',
      '광주광역시',
      '울산광역시',
      '세종특별자치시',
      '강원특별자치도',
      '충청북도',
      '충남',
      '전북특별자치도',
      '전라남도',
      '경상북도',
      '경남',
      '제주특별자치도',
      'Seoul (South Korea)',
      'Busan',
      'Yongin, Gyeonggi-do',
    ];
    expect(locations.filter((location) => !isKoreanLocation(location))).toEqual([]);
  });

  it('해외 도시와 온라인을 국내로 오인하지 않는다', () => {
    expect(
      ['Cambridge (UK)', 'London', 'Paris', 'Online', '온라인', ''].filter(isKoreanLocation),
    ).toEqual([]);
  });
});
