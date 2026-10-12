// ISO 3166-1 alpha-2 전체 국가 코드 (UN 회원국 및 주요 여행 자치령 포함 249개)
const ISO_COUNTRY_CODES = [
  'KR', 'JP', 'VN', 'TH', 'TW', 'US', 'FR', 'IT', 'ES', 'GB', 'DE', 'CH', 'AT', 'CZ', 'HU', 'PT',
  'GR', 'NL', 'BE', 'CA', 'AU', 'NZ', 'SG', 'MY', 'ID', 'PH', 'HK', 'MO', 'CN', 'MN', 'TR', 'AE',
  'QA', 'EG', 'MA', 'ZA', 'MX', 'BR', 'AR', 'PE', 'CL', 'CO', 'GU', 'MP', 'MV', 'LK', 'IN', 'NP',
  'LA', 'KH', 'MM', 'BN', 'KZ', 'UZ', 'GE', 'AM', 'AZ', 'PL', 'SE', 'NO', 'DK', 'FI', 'IS', 'IE',
  'HR', 'SI', 'RS', 'RO', 'BG', 'SK', 'EE', 'LV', 'LT', 'LU', 'MT', 'CY', 'MC', 'AD', 'SM', 'VA',
  'LI', 'RU', 'UA', 'BY', 'MD', 'BA', 'ME', 'MK', 'AL', 'XK', 'IL', 'JO', 'SA', 'OM', 'KW', 'BH',
  'LB', 'IQ', 'IR', 'PK', 'BD', 'BT', 'AF', 'TM', 'TJ', 'KG', 'SY', 'YE', 'PS', 'DZ', 'TN', 'LY',
  'SD', 'SS', 'ET', 'KE', 'TZ', 'UG', 'RW', 'SC', 'MU', 'MG', 'NA', 'BW', 'ZW', 'ZM', 'MW', 'MZ',
  'AO', 'CD', 'CG', 'CM', 'GA', 'GQ', 'CF', 'TD', 'NE', 'NG', 'BJ', 'TG', 'GH', 'CI', 'LR', 'SL',
  'GN', 'GW', 'SN', 'GM', 'ML', 'BF', 'MR', 'CV', 'ST', 'DJ', 'ER', 'SO', 'KM', 'BI', 'LS', 'SZ',
  'CU', 'DO', 'JM', 'BS', 'BB', 'TT', 'HT', 'PR', 'CR', 'PA', 'GT', 'BZ', 'HN', 'SV', 'NI', 'VE',
  'EC', 'BO', 'PY', 'UY', 'GY', 'SR', 'GF', 'FK', 'GL', 'BM', 'KY', 'VG', 'VI', 'AW', 'CW', 'SX',
  'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'FJ', 'PG', 'SB', 'VU', 'NC', 'PF', 'WS', 'TO', 'KI', 'TV',
  'NR', 'PW', 'FM', 'MH', 'CK', 'NU', 'TK', 'AS', 'WF', 'TL', 'KP'
];

// 자주 쓰는 여행지 별칭/도시 키워드 (예: '다낭', '오사카', '방콕', '괌' 등으로 검색해도 국기가 바로 나오도록 지원)
const SEARCH_ALIASES = {
  KR: '한국 대한민국 서울 제주 부산',
  JP: '일본 도쿄 오사카 교토 후쿠오카 삿포로 오키나와',
  VN: '베트남 다낭 호이안 나트랑 하노이 호치민 푸꾸옥 달랏',
  TH: '태국 방콕 치앙마이 푸켓 파타야',
  TW: '대만 타이완 타이베이 가오슝 타이중',
  US: '미국 하와이 뉴욕 LA 로스앤젤레스 샌프란시스코 라스베이거스',
  GU: '괌 미국령',
  MP: '사이판 북마리아나제도',
  FR: '프랑스 파리 니스',
  IT: '이탈리아 로마 베네치아 피렌체 밀라노',
  ES: '스페인 바르셀로나 마드리드 세비야',
  GB: '영국 런던 에든버러',
  DE: '독일 뮌헨 프랑크푸르트 베를린',
  CH: '스위스 인터라켄 취리히 루체른',
  CA: '캐나다 밴쿠버 토론토 퀘벡',
  AU: '호주 시드니 멜버른 브리즈번',
  NZ: '뉴질랜드 오클랜드 퀸스타운',
  SG: '싱가포르',
  MY: '말레이시아 쿠알라룸푸르 코타키나발루',
  ID: '인도네시아 발리 자카르타',
  PH: '필리핀 세부 보홀 보라카이 마닐라 클락',
  HK: '홍콩',
  MO: '마카오',
  CN: '중국 상하이 베이징 칭다오 장가계',
  TR: '튀르키예 터키 이스탄불 카파도키아',
  MV: '몰디브',
};

// 국가 선택 시 자동 추천 통화 매핑
export const COUNTRY_TO_CURRENCY = {
  KR: 'KRW',
  JP: 'JPY',
  VN: 'VND',
  TH: 'THB',
  TW: 'TWD',
  US: 'USD',
  GU: 'USD',
  MP: 'USD',
  PR: 'USD',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  DE: 'EUR',
  AT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  PT: 'EUR',
  GR: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  HR: 'EUR',
  GB: 'GBP',
  CH: 'CHF',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  SG: 'SGD',
  MY: 'MYR',
  ID: 'IDR',
  PH: 'PHP',
  HK: 'HKD',
  MO: 'MOP',
  CN: 'CNY',
  MN: 'MNT',
  TR: 'TRY',
  AE: 'AED',
  MX: 'MXN',
  CZ: 'CZK',
  HU: 'HUF',
};

// 기본 지원 통화 목록 및 1단위당 원화(KRW) 기준 환율
export const DEFAULT_CURRENCIES = {
  KRW: { code: 'KRW', name: '대한민국 원', symbol: '₩', rate: 1, flag: '🇰🇷' },
  JPY: { code: 'JPY', name: '일본 엔', symbol: '¥', rate: 9.2, flag: '🇯🇵' },
  VND: { code: 'VND', name: '베트남 동', symbol: '₫', rate: 0.055, flag: '🇻🇳' },
  USD: { code: 'USD', name: '미국 달러', symbol: '$', rate: 1380, flag: '🇺🇸' },
  EUR: { code: 'EUR', name: '유럽 유로', symbol: '€', rate: 1500, flag: '🇪🇺' },
  THB: { code: 'THB', name: '태국 바트', symbol: '฿', rate: 40.5, flag: '🇹🇭' },
  TWD: { code: 'TWD', name: '대만 달러', symbol: 'NT$', rate: 43.0, flag: '🇹🇼' },
  CNY: { code: 'CNY', name: '중국 위안', symbol: '¥', rate: 193.0, flag: '🇨🇳' },
  HKD: { code: 'HKD', name: '홍콩 달러', symbol: 'HK$', rate: 177.0, flag: '🇭🇰' },
  SGD: { code: 'SGD', name: '싱가포르 달러', symbol: 'S$', rate: 1030.0, flag: '🇸🇬' },
  PHP: { code: 'PHP', name: '필리핀 페소', symbol: '₱', rate: 24.0, flag: '🇵🇭' },
  IDR: { code: 'IDR', name: '인도네시아 루피아', symbol: 'Rp', rate: 0.088, flag: '🇮🇩' },
  MYR: { code: 'MYR', name: '말레이시아 링깃', symbol: 'RM', rate: 315.0, flag: '🇲🇾' },
  AUD: { code: 'AUD', name: '호주 달러', symbol: 'A$', rate: 920.0, flag: '🇦🇺' },
  CAD: { code: 'CAD', name: '캐나다 달러', symbol: 'C$', rate: 1000.0, flag: '🇨🇦' },
  GBP: { code: 'GBP', name: '영국 파운드', symbol: '£', rate: 1790.0, flag: '🇬🇧' },
  CHF: { code: 'CHF', name: '스위스 프랑', symbol: 'CHF', rate: 1590.0, flag: '🇨🇭' },
  NZD: { code: 'NZD', name: '뉴질랜드 달러', symbol: 'NZ$', rate: 830.0, flag: '🇳🇿' },
  TRY: { code: 'TRY', name: '튀르키예 리라', symbol: '₺', rate: 40.0, flag: '🇹🇷' },
  AED: { code: 'AED', name: 'UAE 디르함', symbol: 'AED', rate: 375.0, flag: '🇦🇪' },
  MXN: { code: 'MXN', name: '멕시코 페소', symbol: 'Mex$', rate: 70.0, flag: '🇲🇽' },
  MNT: { code: 'MNT', name: '몽골 투그릭', symbol: '₮', rate: 0.4, flag: '🇲🇳' },
  CZK: { code: 'CZK', name: '체코 코루나', symbol: 'Kč', rate: 59.0, flag: '🇨🇿' },
  HUF: { code: 'HUF', name: '헝가리 포린트', symbol: 'Ft', rate: 3.8, flag: '🇭🇺' },
  MOP: { code: 'MOP', name: '마카오 파타카', symbol: 'MOP$', rate: 172.0, flag: '🇲🇴' },
};

// 테마/오브젝트 기본 아이콘
export const THEME_ICONS = [
  { emoji: '✈️', name: '비행기 항공' },
  { emoji: '🏖️', name: '해변 휴양지 바다' },
  { emoji: '🗼', name: '타워 랜드마크' },
  { emoji: '🏔️', name: '산 트레킹 자연' },
  { emoji: '🏕️', name: '캠핑 글램핑' },
  { emoji: '🚢', name: '크루즈 배' },
  { emoji: '⛩️', name: '신사 사원 문화' },
  { emoji: '🥐', name: '미식 빵 카페 투어' },
];

export function isoToFlagEmoji(isoCode) {
  return isoCode
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

let cachedCountries = null;

export function getAllCountryFlags() {
  if (cachedCountries) return cachedCountries;

  const koNames =
    typeof Intl !== 'undefined' && Intl.DisplayNames
      ? new Intl.DisplayNames(['ko'], { type: 'region' })
      : null;
  const enNames =
    typeof Intl !== 'undefined' && Intl.DisplayNames
      ? new Intl.DisplayNames(['en'], { type: 'region' })
      : null;

  cachedCountries = ISO_COUNTRY_CODES.map((code) => {
    const ko = koNames?.of(code) || code;
    const en = enNames?.of(code) || code;
    const emoji = isoToFlagEmoji(code);
    const aliases = SEARCH_ALIASES[code] || '';
    const currency = COUNTRY_TO_CURRENCY[code] || null;
    return {
      code,
      emoji,
      name: ko,
      enName: en,
      currency,
      searchText: `${ko} ${en} ${code} ${aliases}`.toLowerCase(),
    };
  });

  return cachedCountries;
}

export function searchFlagsAndIcons(query = '') {
  const allCountries = getAllCountryFlags();
  const q = query.trim().toLowerCase();
  if (!q) {
    // 검색어가 없을 때는 주요 인기 여행국 국기 + 테마 아이콘 노출
    return [
      ...allCountries.slice(0, 24),
      ...THEME_ICONS.map((t) => ({
        code: t.emoji,
        emoji: t.emoji,
        name: t.name.split(' ')[0],
        currency: null,
      })),
    ];
  }

  const matchedCountries = allCountries.filter((c) => c.searchText.includes(q));
  const matchedThemes = THEME_ICONS.filter((t) => t.name.toLowerCase().includes(q)).map((t) => ({
    code: t.emoji,
    emoji: t.emoji,
    name: t.name.split(' ')[0],
    currency: null,
  }));

  return [...matchedCountries, ...matchedThemes];
}
