/** 위치에 명시된 국가·도시·광역 행정구역으로 국내 행사를 판정한다. */
export function isKoreanLocation(location: string): boolean {
  return /대한민국|한국|서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주|용인|성남|수원|판교|\b(?:korea|seoul|busan|incheon|daegu|daejeon|gwangju|ulsan|sejong|jeju|gyeonggi|yongin|seongnam|suwon|pangyo)\b/i.test(
    location,
  );
}
