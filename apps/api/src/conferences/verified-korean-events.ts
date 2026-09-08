import type { DiscoveredConference } from './event-candidate';

/** 공개 피드가 없는 주최자의 공식 공지를 확인한 일정. 매년 날짜를 추정해 갱신하지 않는다. */
export const VERIFIED_KOREAN_EVENTS: DiscoveredConference[] = [
  {
    name: 'FECONF 2026',
    url: 'https://feconf.kr',
    startDate: '2026-10-24',
    endDate: null,
    location: '서울 롯데월드타워',
    topics: ['Frontend'],
    kind: 'conference',
    description:
      '일정 출처: FEConf 주최자 공식 계정. https://www.linkedin.com/company/feconf/ · 2026-09-08 공식 개최일·장소 확인. 참가 가능 여부는 공식 안내에서 확인하세요.',
  },
  {
    name: 'if(kakao)dev 2026',
    url: 'https://if.kakao.com',
    startDate: '2026-10-13',
    endDate: '2026-10-14',
    location: '경기도 용인시 카카오 AI 캠퍼스',
    topics: ['AI', '개발'],
    kind: 'conference',
    description:
      '일정 출처: 카카오 공식 행사 사이트 및 기업 보도자료. https://if.kakao.com/2026 · 2026-09-08 공식 개최일·장소 확인. 참가 가능 여부는 공식 안내에서 확인하세요.',
  },
  {
    name: 'MUSINSA PATTERN ’26 Tech Conference',
    url: 'https://pattern.musinsa.com/',
    startDate: '2026-09-18',
    endDate: null,
    location: '서울 본다빈치뮤지엄',
    topics: ['AI', '개발', '프로덕트'],
    kind: 'conference',
    description:
      '일정 출처: MUSINSA 무신사 공식 계정. https://kr.linkedin.com/company/musinsacom · 2026-09-08 공식 개최일·장소 확인. 참가 가능 여부는 공식 안내에서 확인하세요.',
  },
  {
    name: '2026 NAIS AI 해커톤',
    url: 'https://www.nst.re.kr/www/selectBbsNttView.do?bbsNo=1&key=54&nttNo=51734',
    startDate: '2026-09-30',
    endDate: '2026-10-01',
    location: '서울드래곤시티 호텔 컨벤션센터 3층 신라홀',
    topics: ['AI', 'AI Agent', 'Hackathon'],
    kind: 'hackathon',
    description:
      '일정 출처: 국가과학기술연구회 국가과학AI연구센터. https://www.nst.re.kr/www/selectBbsNttView.do?bbsNo=1&key=54&nttNo=51734&pageIndex=1&searchCnd=all · 2026-09-08 공식 개최일·장소 확인. 참가 가능 여부는 공식 안내에서 확인하세요.',
  },
  {
    name: 'AI for Science Conference 2026 (AI4Sci Korea)',
    url: 'https://ai4scikorea.org/',
    startDate: '2026-09-27',
    endDate: '2026-10-01',
    location: '서울드래곤시티 그랜드볼룸',
    topics: ['AI', 'Machine Learning', 'AI Agent'],
    kind: 'conference',
    description:
      '일정 출처: AI4Sci Korea 공식 행사 사이트 / 국가과학기술연구회. https://ai4scikorea.org/ · 2026-09-08 공식 개최일·장소 확인. 참가 가능 여부는 공식 안내에서 확인하세요.',
  },
  {
    name: 'FOSS for All Conference 2026',
    url: 'https://2026.fossforall.org/',
    startDate: '2026-11-28',
    endDate: null,
    location: '서울 센터필드 EAST 18층 AWS Korea',
    topics: ['Open Source', '개발 커뮤니티'],
    kind: 'conference',
    description:
      '일정 출처: FOSS for All 공식 포럼 및 행사 사이트. https://forum.fossforall.org/t/foss-for-all-conferene-2026/99 · 2026-09-08 공식 개최일·장소 확인. 참가 가능 여부는 공식 안내에서 확인하세요.',
  },
  {
    name: 'Builders & Brews: Seoul Hack Edition',
    url: 'https://luma.com/xzoaosda',
    startDate: '2026-09-11',
    endDate: null,
    location: '서울 마포구 성지길 40 WOOMUL(우물)',
    topics: ['AI', 'Open Source'],
    kind: 'meetup',
    description:
      '일정 출처: Tavily Events / Nebius Developer Community / Bloom 주최 행사 페이지. https://luma.com/xzoaosda · 2026-09-08 공식 개최일·장소 확인. 참가 가능 여부는 공식 안내에서 확인하세요.',
  },
  {
    name: 'Midnight Korea Hackathon 2026',
    url: 'https://luma.com/2pnv2fwk',
    startDate: '2026-09-01',
    endDate: '2026-09-27',
    location: '대한민국 커뮤니티 · 온라인 (Midnight Korea)',
    topics: ['Hackathon', 'Web3', 'Privacy', 'Zero-Knowledge'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://luma.com/2pnv2fwk · 2026-09-08 확인. Midnight Korea 공식 주최 페이지이며 Midnight 본사 https://midnight.network/hackathon 에서도 동일 대회를 안내한다. 공식 본문에 온라인 개발 기간을 2026년 9월 1일부터 27일까지로 명시한다. JSON-LD는 시작 9월 1일 00:00 KST, 종료 9월 28일 00:00 KST다. 이는 마지막 개발일 9월 27일 종료와 일치한다. 9월 27일까지 DApp을 개발·제출하고 심사한다. 10월 2일 서울 Privacy Night는 상위 팀의 별도 데모 행사다. 본행사는 한국 현장 개최가 아니라 한국 커뮤니티가 주최하는 온라인 대회다. 10월 2일 데모데이를 본행사 종료일로 늘리지 않았다.',
  },
  {
    name: 'Daytona HackSprint Seoul 해커톤',
    url: 'https://luma.com/daytonaseoul',
    startDate: '2026-09-19',
    endDate: '2026-09-19',
    location: '대한민국 서울 · 상세 장소는 승인 후 안내',
    topics: ['Hackathon', 'AI', 'AI Agents', 'Daytona'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://luma.com/daytonaseoul · 2026-09-08 확인. 주최자 AI Builders와 공동주최 Daytona가 게시한 공식 Luma 행사다. 공식 Event JSON-LD: 2026-09-19T13:00:00+09:00부터 18:00:00+09:00까지, EventScheduled, 국가 KR·서울. 행사 본문에 당일 개발·프로토타입 시연·심사·수상 절차가 있어 단순 워크숍이나 킥오프 모임이 아니다. 정확한 실내 장소는 등록 승인자에게만 공개되어 서울까지만 기록했다.',
  },
  {
    name: 'Habsida Hackathon 2026 [ENG]',
    url: 'https://luma.com/cwaixvls',
    startDate: '2026-09-24',
    endDate: '2026-09-25',
    location: '대한민국 인천 연수구 비류대로 429 HABSIDA Space 5층 501호',
    topics: ['Hackathon', 'Startup', 'AI'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://luma.com/cwaixvls · 2026-09-08 확인. Habsida Coding School이 운영·주최하는 공식 Luma 행사이며 Habsida Space에서 열린다. 공식 Event JSON-LD와 페이지 상태의 start_at/end_at 모두 2026년 9월 24일 11:00 KST부터 25일 15:00 KST까지로 일치한다. 1일차 팀 개발·밤샘 코딩, 2일차 코드 마감·제품 발표·심사·시상이 명시되어 실제 제품 제작 경쟁임을 확인했다. 본문에 일반적인 weekend 표현이 남아 있으나 공개된 구체 날짜는 목·금요일이다. 일정은 공식 구조화 데이터의 명시 날짜를 사용했다. 본문이 연결한 추가 Notion 안내는 웹 도구에서 열리지 않았다.',
  },
  {
    name: 'GWDC Hackathon 2026 Korea',
    url: 'https://www.gwdc.net/hackathon.html',
    startDate: '2026-09-28',
    endDate: '2026-09-30',
    location: '대한민국 서울 aT센터',
    topics: ['Hackathon', 'Web3', 'Blockchain'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://www.gwdc.net/hackathon.html · 2026-09-08 확인. GWDC 주최자 공식 해커톤 전용 페이지에 2026 Korea 대회와 서울 aT Center가 명시된다. 9월 28일 17:00–20:00 KST 체크인·과제 안내, 9월 29일 종일 개발, 9월 30일 12:00 제출·15:00–17:00 결선 및 시상이다. 컨퍼런스 본행사 9월 29–30일과 구분하여 해커톤 시작일을 9월 28일로 기록했다. 과거 홍콩 회차는 제외했다. 상금 액수가 다른 홍보 페이지와 일치하지 않아 상금은 수집하지 않았다.',
  },
  {
    name: 'KOREAN DEFENSE TECH HACKTHON | EDTH x D4D',
    url: 'https://luma.com/d4d_edth',
    startDate: '2026-10-09',
    endDate: '2026-10-11',
    location: '대한민국 서울 서초구 강남대로30길',
    topics: ['Hackathon', 'Robotics', 'AI', 'Hardware'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://luma.com/d4d_edth · 2026-09-08 확인. D4D와 EDTH 공식 행사 페이지이며 주최자가 https://events.eurodefense.tech/events/korean-defense-tech-hackathon 을 신청처로 연결한다. 공식 본문과 Event JSON-LD 모두 2026년 10월 9–11일 서울로 일치하며, JSON-LD는 9일 18:00 KST 시작·11일 16:00 종료다. 9일 커뮤니티 세션, 10일 과제 발표·팀 구성·개발, 11일 제출·심사·피칭·시상으로 이어지는 대회 전체 일정이다. 공식 장소 필드가 도로명까지만 공개되어 건물명은 추가하지 않았다. 별도 신청처 페이지는 웹 도구에서 열리지 않아 일정·장소 근거는 공식 주최자 Luma 본문 및 JSON-LD로 한정했다.',
  },
  {
    name: 'c0mpiled-18: Seoul',
    url: 'https://luma.com/compiled-8lsr',
    startDate: '2026-11-09',
    endDate: '2026-11-09',
    location: '대한민국 서울 강남구 영동대로 513 COEX 2층 A01 Startup Branch',
    topics: ['Hackathon', 'AI', 'Web3', 'Startup'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://luma.com/compiled-8lsr · 2026-09-08 확인. Transpose Platform이 주최하고 한국벤처캐피탈협회·아산나눔재단·한국무역협회가 공동주최하는 c0mpiled 해커톤이다. 공식 본문과 Event JSON-LD 모두 2026년 11월 9일 09:00–19:00 KST, 서울 코엑스 Startup Branch로 일치한다. 당일 제품 제작과 상금 경쟁, AI·Crypto 과제를 명시하여 단순 네트워킹 모임과 구분했다. 참가 승인 필요. 세부 시간표와 심사위원은 아직 TBD다.',
  },
  {
    name: 'TRUST404 해커톤 데모데이',
    url: 'https://luma.com/mbhofe9t',
    startDate: '2026-09-29',
    endDate: null,
    location: '대한민국 서울 서초구 강남대로 311 드림플러스 강남',
    topics: ['Hackathon', 'Web3', 'Security'],
    kind: 'hackathon',
    description:
      '일정 출처: ANAM145·Blockchain Valley 공식 공지 https://luma.com/mbhofe9t · 2026-09-08 확인. 9월 29일은 해커톤 결선 시연·심사·시상일입니다. 온라인 개발은 참가 등록 후 진행하고 9월 20일까지 제출합니다. 팀 1~5명, 참가비 무료. 개발 시작일은 공개되지 않아 추정하지 않았습니다.',
  },
  {
    name: 'Agent Field Trip 2026: Incheon',
    url: 'https://gdg.community.dev/events/details/google-gdg-incheon-presents-io-extended-agent-field-trip-2026-incheon/',
    startDate: '2026-09-12',
    endDate: '2026-09-12',
    location: '인천 · 인천맥주 호랑이 및 동인천 일대',
    topics: ['Hackathon', 'AI', 'Agent'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://gdg.community.dev/events/details/google-gdg-incheon-presents-io-extended-agent-field-trip-2026-incheon/ · 2026-09-08 확인. GDG Incheon 공식 행사 본문이 2026년 9월 12일 10:00~16:00과 인천맥주 호랑이·동인천 일대를 명시한다. 현장 문제를 관찰하고 AI Agent로 작동하는 서비스를 제작하는 팀 해커톤이다. 주최자 티켓 페이지 https://ticketa.co/event/xnhamniu 에도 같은 본행사 날짜와 진행 방식이 기재되어 있다. GDG 상단 UTC 시간과 본문 시간이 불일치하므로 날짜만 저장했다. 주최자 채널별 상상플랫폼·아트플랫폼 주소 표기가 달라 세부 도로명 주소를 단정하지 않았다. 참가 모집 마감 여부는 주최자에게 확인해야 한다. 행사가 앞으로 열린다는 사실과 신규 참가 가능 여부는 다르다.',
  },
  {
    name: '2026 금천과학축제 바이브코딩 해커톤',
    url: 'https://www.geumcheon.go.kr/portal/selectBbsNttView.do?bbsNo=8&key=297&nttNo=270857',
    startDate: '2026-09-19',
    endDate: '2026-09-19',
    location: '서울 · 금천구청 대강당',
    topics: ['Hackathon', '청소년', 'AI'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://www.geumcheon.go.kr/portal/selectBbsNttView.do?bbsNo=8&key=297&nttNo=270857 · 2026-09-08 확인. 금천구청 2026년 9월 7일 보도자료가 본행사를 9월 19일 금천구청 대강당으로 명시한다. 사전교육 이수자 50명이 5명씩 10개 팀으로 참가한다. 금천구 공식 예약 안내 https://www.geumcheon.go.kr/reserve/edcLctreView.do?key=112&searchLctreKey=157307 에 본행사 시간이 9월 19일 12:00~17:00으로 명시되어 있다. 금천구 거주 초등학교 4~6학년 및 중학생 대상이다. 일반 성인 개발자 대상 행사가 아니다. 9월 12일 또는 13일 사전교육 이수가 필요하다. 금천사이언스큐브는 교육예약에 기재된 사전교육 장소이며 본행사 장소와 구분했다. 접수 마감 9월 10일을 개최일로 사용하지 않았다.',
  },
  {
    name: 'PAC 2026 피지컬 AI 챌린지 해커톤',
    url: 'https://ainnov.co.kr/pac2026',
    startDate: '2026-10-09',
    endDate: '2026-10-10',
    location: '대구 · 경북대학교 크리에이티브파크',
    topics: ['Hackathon', 'AI', 'Robotics'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://ainnov.co.kr/pac2026 · 2026-09-08 확인. 공식 대회 사이트의 두 분과 일정 모두 대회·현장발표를 2026년 10월 9~10일 경북대학교 크리에이티브파크로 명시한다. 로봇 미션 구현 분과와 기업 문제 해결형 IR 피칭 분과로 구성된다. 전국 고등학생, 대학원생, 일반인이 참가할 수 있으며 팀장 포함 최대 5인 팀을 모집한다. 접수 마감 9월 27일과 사전 온라인 멘토링 10월 6일은 본행사 날짜에서 제외했다. 경북대 사업단 공지 https://ipc.knu.ac.kr/bbs/board.php?bo_table=notice&wr_id=393 의 검색 색인은 같은 날짜·장소를 명시하지만 현재 직접 열면 글 삭제·이동 안내가 나와, 정상 열리는 공식 대회 사이트를 대표 근거로 삼았다.',
  },
  {
    name: '2026 뉴스빅데이터 해커톤 본선 개발',
    url: 'https://www.newsbigdata.kr/summary',
    startDate: '2026-10-12',
    endDate: '2026-10-30',
    location: '대한민국 대회 · 본선 장소 미공개',
    topics: ['Hackathon', 'AI', 'Data'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://www.newsbigdata.kr/summary · 2026-09-08 확인. 한국언론진흥재단 공식 대회 요강에서 본선 멘토링·프로토타입 개발 기간을 2026년 10월 12~30일로 명시한다. 본선 OT는 10월 7일, 본선 PT 심사는 11월 3일, 시상식은 11월 24일로 각각 구분되어 있다. 만 15~34세 청년으로 구성된 2~5인 팀이 빅카인즈 API를 활용한 실제 동작 서비스를 개발한다. 공식 기관 사업 안내 https://www.culture.go.kr/portal/cltBnf/cltSup/view.do?indRow=147&menuNo=200104&rcrtSn=228107&sWord=&selectType=&viewTp=3&weekju=&yearmonth= 에서 한국언론진흥재단의 전국 대상 행사임을 확인했다. 공식 요강에 본선 도시·건물 주소가 없어 서울 또는 온라인으로 추측하지 않았다. 국내 기관 전국대회라는 정보와 개최 장소의 확정 여부를 구분해야 한다. 접수 마감은 9월 17일이며, 목록 사이트에 나타나는 9월 18일은 공식 본선 개최일이 아니다. endDate는 실제 개발 기간의 종료일이다. 뒤의 PT 심사·시상식까지 연속 개발 행사로 표시하지 않았다.',
  },
  {
    name: '제6회 그린리모델링 챌린지 대학생 해커톤 본선',
    url: 'https://2026grchallenge.com/front/board/boardDetail?bo_id=1&index_no=3&curPage=1',
    startDate: '2026-10-24',
    endDate: '2026-10-25',
    location: '경기 양평군 · 블룸비스타 호텔앤컨퍼런스',
    topics: ['Hackathon', '대학생', 'AI', 'Sustainability'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://2026grchallenge.com/front/board/boardDetail?bo_id=1&index_no=3&curPage=1 · 2026-09-08 확인. 2026년 8월 12일 공식 대학생 해커톤 공지에서 본선을 10월 24~25일, 블룸비스타 호텔앤컨퍼런스(경기 양평군)로 명시한다. 국내 대학 재학생·휴학생 및 대학원생 대상으로 에너지·온실가스 저감 설계와 AI 플랫폼 아이디어 두 부문을 운영한다. 국토안전관리원 공지 https://www.greenremodeling.or.kr/n1/board/boardView.asp?bid=notice&nSeq=5829 가 이 대회 사이트를 공식 참가 페이지로 연결한다. 접수 마감 9월 30일과 사생대회 10월 17일은 해커톤 일정에서 제외했다. AI 부문은 서비스 기획·시각화 자료를 고도화하는 방식이다. 모든 부문이 코딩 중심 대회인 것은 아니다.',
  },
  {
    name: '제8회 한국코드페어 해커톤 본선',
    url: 'https://kcf.or.kr/84/?bmode=view&idx=171991931',
    startDate: '2026-10-24',
    endDate: '2026-10-25',
    location: '광주 · 해커톤 본선 세부 장소 확인 필요',
    topics: ['Hackathon', '청소년', 'AI'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://kcf.or.kr/84/?bmode=view&idx=171991931 · 2026-09-08 확인. 한국코드페어 운영사무국 전체 일정 공지의 해커톤 항목에 본선 2026년 10월 24~25일, 1박 2일이 명시되어 있다. 공식 해커톤 안내 https://www.kcf.or.kr/79 는 대한민국 국적 중·고등학생 개인 또는 3인 이하 팀을 대상으로 한다. 광주 개최는 용두중학교 공식 전달 공지 https://yongdu.jge.ms.kr/xboard/board.php?keyset=W_NAME&mode=view&number=15904&page=2&sCat=0&searchword=%EC%9D%B4%EC%A0%95%ED%99%94&tbnum=60 의 2026년 개요 중 광주광역시 본선 10월 안내로 확인했다. 일반 성인 개발자는 참가 대상이 아니다. 8월 18일 예선 접수는 이미 마감되었다. 일정 공지의 김대중컨벤션센터 장소는 SW공모전 행에만 직접 명시된다. 그 장소를 해커톤에도 적용한다고 추측하지 않았다. 학교 전달 공지 첫 문장에 2025년 문구가 남아 있으나 항목별 행사명·연도는 2026년이다. 정확한 해커톤 일정은 학교 문구가 아닌 공식 운영사무국 공지를 사용했다.',
  },
  {
    name: 'BLOCK AI 26 블록체인 AI 융합 해커톤 본선',
    url: 'https://blockhack.kr/',
    startDate: '2026-11-06',
    endDate: '2026-11-07',
    location: '서울 · 스페이스 쉐어 삼성역센터',
    topics: ['Hackathon', '대학생', 'AI', 'Blockchain', 'Web3'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://blockhack.kr/ · 2026-09-08 확인. 공식 사이트 일정표와 본선 AGENDA에 2026년 11월 6~7일 서울 스페이스 쉐어 삼성역센터가 명시되어 있다. 교육부·한국연구재단·COSS 주최, 충남대학교·한국AI블록체인융합원 주관이다. 국내 대학 재학생·휴학생·수료생을 대상으로 하며, 블록체인·AI 프로토타입 구현과 최종 데모 발표를 진행한다. 접수 마감 9월 14일과 온라인 OT 9월 19일을 본선 날짜와 구분했다. 9월 19일~11월 5일 사전 멘토링 및 1박 2일 본선 전 일정 참석 조건이 있다.',
  },
  {
    name: 'SoftBank Hackathon 2026 in Korea 본선',
    url: 'https://forms.gle/9vXsmqinYgMzmXnE7',
    startDate: '2026-11-07',
    endDate: '2026-11-08',
    location: '서울 · 세부 장소 추후 안내',
    topics: ['Hackathon', 'Cloud', 'AWS', 'GCP', 'Azure'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://forms.gle/9vXsmqinYgMzmXnE7 · 2026-09-08 확인. Progate가 생성한 공식 신청폼에서 본선 2026년 11월 7~8일을 직접 확인했다. 영남대학교 공식 전달 공지 https://www.yu.ac.kr/cse/community/notice.do?article.offset=0&articleLimit=10&articleNo=231160617&mode=view 가 본선 개최 도시를 서울로 명시하고 같은 신청폼으로 연결한다. 서울 예선은 10월 3~4일, 부산 예선은 10월 10~11일이다. 한 대회의 지역 예선을 별도 대회 수로 늘리지 않았다. SoftBank·Progate·KOREC 공동 주최로 클라우드 기술을 활용한 사회문제 해결 프로젝트를 개발한다. 예선 통과자 대상 본선이며 예선·본선 현장 참석이 필수다. 신청 마감은 9월 22일이다. 일본 기업 채용 연계 목적과 입사 시점 만 30세 미만 등 참가 조건이 있다. 상세 개최 장소는 신청폼에서 추후 안내로 명시되어 있어 건물을 추측하지 않았다. 신청폼 내 한국어 서울 킥오프 날짜 일부에 오기가 있으나 예선 본행사·본선 날짜는 양언어에서 일치한다. 킥오프를 개최일로 사용하지 않았다.',
  },
  {
    name: '2026 K-조선 해커톤 본선',
    url: 'https://event-us.kr/koshiphackathon/event/132963',
    startDate: '2026-11-09',
    endDate: '2026-11-09',
    location: '서울 서초구 · 양재 엘타워',
    topics: ['Hackathon', '대학생', 'AI', 'Industry'],
    kind: 'hackathon',
    description:
      '일정 출처: 주최자 공식 공지 https://wwwce.hongik.ac.kr/wwwce/0401.do?articleNo=156042&mode=view · 2026-09-08 확인. 홍익대학교 공식 공지에서 본선을 2026년 11월 9일, 서울 양재 엘타워로 명시한다. 주최자 이벤터스 행사 페이지에도 11월 9일과 서울 서초구 강남대로 213 엘타워가 표시된다. 산업통상부 주최, 한국산업기술진흥원·한국조선해양플랜트협회 관련 센터 주관이며 국내외 대학(원)생이 조선산업 AX 솔루션을 제안·구현한다. 접수 마감 9월 21일은 개최일이 아니다. 대학 공지는 종료 19:00, 주최자 이벤터스는 종료 18:00으로 차이가 있어 확정된 날짜만 저장했다.',
  },
];
