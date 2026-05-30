export interface ConferenceDto {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate?: string;
  location: string;
  topics: string[];
  description?: string;
  brand?: string; // 브랜드 oklch 색
  image?: string; // 대표 이미지 URL (Unsplash 등 공개)
}

// 한국 주요 개발자 컨퍼런스 mock (V1.5에서 자동 수집으로 교체)
export const MOCK_CONFERENCES: ConferenceDto[] = [
  {
    id: 'c1',
    name: 'FECONF 2026',
    url: 'https://feconf.kr',
    startDate: '2026-06-21',
    endDate: '2026-06-21',
    location: '서울 양재 aT센터',
    topics: ['Frontend', 'React', 'Vue'],
    description: '국내 최대 프론트엔드 컨퍼런스. 1,500명 참여 규모로 React / Vue / 웹 성능 / 디자인 시스템 등 다룸.',
    brand: 'oklch(55% 0.20 245)',
    image:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80&auto=format&fit=crop',
  },
  {
    id: 'c2',
    name: 'if(kakao)dev 2026',
    url: 'https://if.kakao.com',
    startDate: '2026-07-09',
    endDate: '2026-07-10',
    location: '온라인',
    topics: ['AI', '플랫폼', '인프라'],
    description: '카카오 개발자 컨퍼런스. AI / 메시징 / 추천 시스템 / Kubernetes 운영 사례 공유.',
    brand: 'oklch(60% 0.18 90)',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80&auto=format&fit=crop',
  },
  {
    id: 'c3',
    name: 'SLASH 26',
    url: 'https://toss.tech/slash',
    startDate: '2026-08-12',
    endDate: '2026-08-13',
    location: '서울 코엑스',
    topics: ['핀테크', '백엔드', 'iOS'],
    description: '토스 개발자 컨퍼런스. 금융 도메인 백엔드 / iOS / 운영 / 보안 / SRE 깊이 있는 세션.',
    brand: 'oklch(52% 0.19 240)',
    image:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80&auto=format&fit=crop',
  },
  {
    id: 'c4',
    name: 'DEVIEW 2026',
    url: 'https://deview.kr',
    startDate: '2026-10-22',
    location: '코엑스',
    topics: ['AI', '검색', '클라우드'],
    description: '네이버 개발자 컨퍼런스. HyperCLOVA / 검색 / 클라우드 / 추천 시스템 트랙 다수.',
    brand: 'oklch(55% 0.18 145)',
    image:
      'https://images.unsplash.com/photo-1535378620166-273708d44e4c?w=1200&q=80&auto=format&fit=crop',
  },
  {
    id: 'c5',
    name: 'PyCon Korea 2026',
    url: 'https://pycon.kr',
    startDate: '2026-09-05',
    endDate: '2026-09-07',
    location: '서울대학교',
    topics: ['Python', 'Data', 'ML'],
    description: '한국 파이썬 컨퍼런스. ML / 데이터 엔지니어링 / 웹 / DevOps 다양한 트랙.',
    brand: 'oklch(58% 0.16 230)',
    image:
      'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1200&q=80&auto=format&fit=crop',
  },
];
