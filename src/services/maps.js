// 내장 주요 여행지 명소 DB (오프라인 및 빠른 자동완성/좌표 핀 제공)
export const PRESET_PLACES = [
  // 다낭 & 호이안 (베트남)
  { place_name: '다낭 국제공항', category: 'transit', lat: 16.0539, lng: 108.1994, address: '다낭, 베트남 (Da Nang Airport)' },
  { place_name: '한시장 (Han Market)', category: 'spot', lat: 16.0681, lng: 108.2244, address: '119 Trần Phú, Hải Châu, 다낭, 베트남' },
  { place_name: '다낭 대성당 (핑크성당)', category: 'spot', lat: 16.0667, lng: 108.2228, address: '156 Trần Phú, 다낭, 베트남' },
  { place_name: '미케 비치 (My Khe Beach)', category: 'spot', lat: 16.0598, lng: 108.2457, address: 'Phước Mỹ, Sơn Trà, 다낭, 베트남' },
  { place_name: '썬월드 바나힐 (골든브릿지)', category: 'spot', lat: 15.9977, lng: 107.9881, address: 'Hòa Ninh, Hòa Vang, 다낭, 베트남' },
  { place_name: '호이안 올드타운 (야시장)', category: 'spot', lat: 15.8771, lng: 108.3260, address: 'Minh An, 호이안, 베트남' },
  { place_name: '안방 비치 (호이안)', category: 'spot', lat: 15.9136, lng: 108.3412, address: 'Cẩm An, 호이안, 베트남' },
  { place_name: '냐벱 (Nhà Bếp) 쌀국수·반쎄오', category: 'food', lat: 16.0574, lng: 108.2442, address: '다낭 미케비치, 베트남' },
  { place_name: '콩카페 다낭 1호점', category: 'cafe', lat: 16.0686, lng: 108.2250, address: '98-96 Bạch Đằng, 다낭, 베트남' },
  // 도쿄 & 오사카 (일본)
  { place_name: '나리타 국제공항 제1터미널', category: 'transit', lat: 35.7719, lng: 140.3929, address: 'Chiba, Narita, 도쿄, 일본' },
  { place_name: '시부야 스카이 (SHIBUYA SKY)', category: 'spot', lat: 35.6580, lng: 139.7016, address: '2-24-12 Shibuya, 도쿄, 일본' },
  { place_name: '이치란 라멘 시부야점', category: 'food', lat: 35.6612, lng: 139.7010, address: '1-22-7 Jinnan, Shibuya, 도쿄' },
  { place_name: '츠키지 장외시장', category: 'food', lat: 35.6655, lng: 139.7707, address: '4 Chome Tsukiji, 도쿄, 일본' },
  { place_name: '센소지 (아사쿠사)', category: 'spot', lat: 35.7147, lng: 139.7966, address: '2-3-1 Asakusa, 도쿄, 일본' },
  { place_name: '도쿄 타워', category: 'spot', lat: 35.6586, lng: 139.7454, address: '4-2-8 Shibakoen, 도쿄, 일본' },
  { place_name: '간사이 국제공항', category: 'transit', lat: 34.4320, lng: 135.2304, address: 'Izumisano, 오사카, 일본' },
  { place_name: '도톤보리 글리코상', category: 'spot', lat: 34.6687, lng: 135.5013, address: '1-10-2 Dotonbori, 오사카, 일본' },
  { place_name: '유니버설 스튜디오 재팬 (USJ)', category: 'spot', lat: 34.6654, lng: 135.4323, address: 'Sakurajima, 오사카, 일본' },
  // 제주 (대한민국)
  { place_name: '제주 국제공항', category: 'transit', lat: 33.5104, lng: 126.4914, address: '제주도 제주시 공항로 2' },
  { place_name: '협재 해수욕장', category: 'spot', lat: 33.3943, lng: 126.2397, address: '제주도 제주시 한림읍 협재리' },
  { place_name: '성산 일출봉', category: 'spot', lat: 33.4581, lng: 126.9426, address: '제주도 서귀포시 성산읍 성산리' },
  { place_name: '오는정김밥', category: 'food', lat: 33.2523, lng: 126.5618, address: '제주도 서귀포시 동문동로 2' },
];

// Haversine 공식 기반 두 좌표 간 직선거리(km) 계산
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateTotalRouteKm(items = []) {
  if (items.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < items.length - 1; i++) {
    sum += getDistanceKm(items[i].lat, items[i].lng, items[i + 1].lat, items[i + 1].lng);
  }
  return Math.round(sum * 10) / 10;
}

// Google Maps JS SDK 동적 로더 (VITE_GOOGLE_MAPS_API_KEY 설정 시 활성화)
let googleMapsPromise = null;
export function loadGoogleMapsSdk() {
  const apiKey = import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || typeof window === 'undefined' || !navigator.onLine) {
    return Promise.resolve(null);
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve(window.google?.maps || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

function inferCategoryFromOsm(item) {
  const type = `${item.type || ''} ${item.category || ''} ${item.class || ''}`.toLowerCase();
  if (type.includes('aerodrome') || type.includes('airport') || type.includes('station')) {
    return 'transit';
  }
  if (type.includes('hotel') || type.includes('hostel') || type.includes('resort')) {
    return 'stay';
  }
  if (type.includes('cafe') || type.includes('bakery')) {
    return 'cafe';
  }
  if (type.includes('restaurant') || type.includes('food') || type.includes('fast_food')) {
    return 'food';
  }
  return 'spot';
}

// 장소 검색 (여행 목적지 맞춤형 내장 프리셋 + 온라인 OpenStreetMap Nominatim 지오코딩 결합)
export async function searchPlaceCandidates(query, destinationHint = '') {
  const q = (query || '').trim().toLowerCase();
  const destTokens = (destinationHint || '')
    .toLowerCase()
    .split(/[\s,&·/]+/)
    .filter((t) => t.length >= 2);

  // 1) 검색어 입력 전: 현재 여행 목적지(예: 다낭, 호이안, 베트남)와 일치하는 추천 명소를 우선 노출
  if (!q) {
    if (destTokens.length > 0) {
      const destMatches = PRESET_PLACES.filter((p) => {
        const hay = `${p.place_name} ${p.address}`.toLowerCase();
        return destTokens.some((tok) => hay.includes(tok));
      });
      if (destMatches.length > 0) return destMatches.slice(0, 8);
    }
    return PRESET_PLACES.slice(0, 6);
  }

  // 2) 내장 프리셋 부분 일치 검색
  const localMatches = PRESET_PLACES.filter(
    (p) =>
      p.place_name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
  );

  // 3) 온라인 시 OpenStreetMap Nominatim 실시간 장소 검색
  if (typeof navigator !== 'undefined' && navigator.onLine && q.length >= 2) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=ko,en&q=${encodeURIComponent(
        query.trim()
      )}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'ko,en' },
      });
      clearTimeout(timer);
      if (res.ok) {
        const remote = await res.json();
        const mapped = remote.map((r) => ({
          place_name: r.name || r.display_name.split(',')[0],
          category: inferCategoryFromOsm(r),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          address: r.display_name.split(',').slice(0, 3).join(', ').trim(),
        }));
        return [...localMatches, ...mapped].slice(0, 8);
      }
    } catch {
      // 오프라인 또는 타임아웃 시 내장 프리셋 즉시 반환
    }
  }

  return localMatches;
}

// --- [추억 탭 세계지도] 서울(인천) 기준점 및 전 세계 주요 여행 도시/국가 위경도 DB ---
export const SEOUL_ORIGIN = {
  city: '서울/인천',
  country: '대한민국',
  countryCode: 'KR',
  flag: '🇰🇷',
  lat: 37.4602,
  lng: 126.4407,
};

export const WORLD_CITIES_DB = [
  // 대한민국
  { city: '제주도', country: '대한민국', countryCode: 'KR', flag: '🇰🇷', lat: 33.4996, lng: 126.5312, aliases: '제주 서귀포 애월 협재 성산' },
  { city: '부산', country: '대한민국', countryCode: 'KR', flag: '🇰🇷', lat: 35.1796, lng: 129.0756, aliases: '해운대 광안리' },
  { city: '강릉', country: '대한민국', countryCode: 'KR', flag: '🇰🇷', lat: 37.7519, lng: 128.8761, aliases: '속초 양양 동해' },
  { city: '경주', country: '대한민국', countryCode: 'KR', flag: '🇰🇷', lat: 35.8562, lng: 129.2247, aliases: '황리단길 불국사' },
  { city: '여수', country: '대한민국', countryCode: 'KR', flag: '🇰🇷', lat: 34.7604, lng: 127.6622, aliases: '순천 남해' },
  // 일본
  { city: '도쿄', country: '일본', countryCode: 'JP', flag: '🇯🇵', lat: 35.6762, lng: 139.6503, aliases: 'tokyo 시부야 신주쿠 긴자 아사쿠사' },
  { city: '오사카', country: '일본', countryCode: 'JP', flag: '🇯🇵', lat: 34.6937, lng: 135.5023, aliases: 'osaka 난바 도톤보리 우메다' },
  { city: '교토', country: '일본', countryCode: 'JP', flag: '🇯🇵', lat: 35.0116, lng: 135.7681, aliases: 'kyoto 아라시야마 기온' },
  { city: '후쿠오카', country: '일본', countryCode: 'JP', flag: '🇯🇵', lat: 33.5902, lng: 130.4017, aliases: 'fukuoka 하카타 텐진 유후인 벳푸' },
  { city: '삿포로', country: '일본', countryCode: 'JP', flag: '🇯🇵', lat: 43.0618, lng: 141.3545, aliases: 'sapporo 홋카이도 오타루 비에이' },
  { city: '오키나와', country: '일본', countryCode: 'JP', flag: '🇯🇵', lat: 26.2124, lng: 127.6809, aliases: 'okinawa 나하 아메리칸빌리지' },
  { city: '나고야', country: '일본', countryCode: 'JP', flag: '🇯🇵', lat: 35.1815, lng: 136.9066, aliases: 'nagoya' },
  // 베트남
  { city: '다낭', country: '베트남', countryCode: 'VN', flag: '🇻🇳', lat: 16.0544, lng: 108.2022, aliases: 'danang da nang 미케비치 바나힐' },
  { city: '호이안', country: '베트남', countryCode: 'VN', flag: '🇻🇳', lat: 15.8801, lng: 108.3380, aliases: 'hoian hoi an 올드타운 안방비치' },
  { city: '나트랑', country: '베트남', countryCode: 'VN', flag: '🇻🇳', lat: 12.2388, lng: 109.1967, aliases: 'nhatrang 나짱 깜란' },
  { city: '푸꾸옥', country: '베트남', countryCode: 'VN', flag: '🇻🇳', lat: 10.2899, lng: 103.9840, aliases: 'phuquoc' },
  { city: '하노이', country: '베트남', countryCode: 'VN', flag: '🇻🇳', lat: 21.0285, lng: 105.8542, aliases: 'hanoi 하롱베이 사파' },
  { city: '호치민', country: '베트남', countryCode: 'VN', flag: '🇻🇳', lat: 10.8231, lng: 106.6297, aliases: 'hochiminh 사이공 무이네' },
  { city: '달랏', country: '베트남', countryCode: 'VN', flag: '🇻🇳', lat: 11.9404, lng: 108.4583, aliases: 'dalat' },
  // 태국 · 대만 · 중화권 · 동남아
  { city: '방콕', country: '태국', countryCode: 'TH', flag: '🇹🇭', lat: 13.7563, lng: 100.5018, aliases: 'bangkok 파타야' },
  { city: '치앙마이', country: '태국', countryCode: 'TH', flag: '🇹🇭', lat: 18.7883, lng: 98.9853, aliases: 'chiangmai' },
  { city: '푸켓', country: '태국', countryCode: 'TH', flag: '🇹🇭', lat: 7.8804, lng: 98.3923, aliases: 'phuket 크라비 코사무이' },
  { city: '타이베이', country: '대만', countryCode: 'TW', flag: '🇹🇼', lat: 25.0330, lng: 121.5654, aliases: 'taipei 타이완 예스진지 단수이' },
  { city: '가오슝', country: '대만', countryCode: 'TW', flag: '🇹🇼', lat: 22.6273, lng: 120.3014, aliases: 'kaohsiung 타이중 타이난' },
  { city: '홍콩', country: '홍콩', countryCode: 'HK', flag: '🇭🇰', lat: 22.3193, lng: 114.1694, aliases: 'hongkong 침사추이 센트럴' },
  { city: '마카오', country: '마카오', countryCode: 'MO', flag: '🇲🇴', lat: 22.1987, lng: 113.5439, aliases: 'macau 코타이' },
  { city: '싱가포르', country: '싱가포르', countryCode: 'SG', flag: '🇸🇬', lat: 1.3521, lng: 103.8198, aliases: 'singapore 마리나베이 센토사' },
  { city: '발리', country: '인도네시아', countryCode: 'ID', flag: '🇮🇩', lat: -8.4095, lng: 115.1889, aliases: 'bali 우붓 스미냑 꾸따 자카르타' },
  { city: '세부', country: '필리핀', countryCode: 'PH', flag: '🇵🇭', lat: 10.3157, lng: 123.8854, aliases: 'cebu 막탄' },
  { city: '보홀', country: '필리핀', countryCode: 'PH', flag: '🇵🇭', lat: 9.8500, lng: 124.1435, aliases: 'bohol 알로나비치' },
  { city: '보라카이', country: '필리핀', countryCode: 'PH', flag: '🇵🇭', lat: 11.9674, lng: 121.9248, aliases: 'boracay 마닐라 클락' },
  { city: '코타키나발루', country: '말레이시아', countryCode: 'MY', flag: '🇲🇾', lat: 5.9804, lng: 116.0735, aliases: 'kotakinabalu' },
  { city: '쿠알라룸푸르', country: '말레이시아', countryCode: 'MY', flag: '🇲🇾', lat: 3.1390, lng: 101.6869, aliases: 'kualalumpur 페낭' },
  { city: '상하이', country: '중국', countryCode: 'CN', flag: '🇨🇳', lat: 31.2304, lng: 121.4737, aliases: 'shanghai 와이탄 디즈니' },
  { city: '베이징', country: '중국', countryCode: 'CN', flag: '🇨🇳', lat: 39.9042, lng: 116.4074, aliases: 'beijing 북경' },
  { city: '칭다오', country: '중국', countryCode: 'CN', flag: '🇨🇳', lat: 36.0671, lng: 120.3826, aliases: 'qingdao 청도 장가계' },
  { city: '울란바토르', country: '몽골', countryCode: 'MN', flag: '🇲🇳', lat: 47.8864, lng: 106.9057, aliases: 'ulaanbaatar 고비사막 테를지' },
  // 미주 · 대양주 · 휴양섬
  { city: '괌', country: '괌 (미국령)', countryCode: 'GU', flag: '🇬🇺', lat: 13.4443, lng: 144.7937, aliases: 'guam 투몬' },
  { city: '사이판', country: '사이판', countryCode: 'MP', flag: '🇲🇵', lat: 15.1778, lng: 145.7509, aliases: 'saipan 마나가하' },
  { city: '호놀룰루 (하와이)', country: '미국', countryCode: 'US', flag: '🇺🇸', lat: 21.3069, lng: -157.8583, aliases: 'hawaii honolulu 와이키키 오아후 마우이' },
  { city: '뉴욕', country: '미국', countryCode: 'US', flag: '🇺🇸', lat: 40.7128, lng: -74.0060, aliases: 'newyork nyc 맨해튼' },
  { city: '로스앤젤레스 (LA)', country: '미국', countryCode: 'US', flag: '🇺🇸', lat: 34.0522, lng: -118.2437, aliases: 'losangeles 할리우드 산타모니카' },
  { city: '샌프란시스코', country: '미국', countryCode: 'US', flag: '🇺🇸', lat: 37.7749, lng: -122.4194, aliases: 'sanfrancisco 금문교 요세미티' },
  { city: '라스베이거스', country: '미국', countryCode: 'US', flag: '🇺🇸', lat: 36.1699, lng: -115.1398, aliases: 'lasvegas 그랜드캐니언' },
  { city: '밴쿠버', country: '캐나다', countryCode: 'CA', flag: '🇨🇦', lat: 49.2827, lng: -123.1207, aliases: 'vancouver 밴프 로키 토론토 퀘벡' },
  { city: '시드니', country: '호주', countryCode: 'AU', flag: '🇦🇺', lat: -33.8688, lng: 151.2093, aliases: 'sydney 오페라하우스 브리즈번' },
  { city: '멜버른', country: '호주', countryCode: 'AU', flag: '🇦🇺', lat: -37.8136, lng: 144.9631, aliases: 'melbourne' },
  { city: '퀸스타운', country: '뉴질랜드', countryCode: 'NZ', flag: '🇳🇿', lat: -45.0312, lng: 168.6626, aliases: 'queenstown 오클랜드 크라이스트처치' },
  // 유럽 · 중동
  { city: '파리', country: '프랑스', countryCode: 'FR', flag: '🇫🇷', lat: 48.8566, lng: 2.3522, aliases: 'paris 에펠탑 니스' },
  { city: '런던', country: '영국', countryCode: 'GB', flag: '🇬🇧', lat: 51.5074, lng: -0.1278, aliases: 'london 에든버러' },
  { city: '로마', country: '이탈리아', countryCode: 'IT', flag: '🇮🇹', lat: 41.9028, lng: 12.4964, aliases: 'rome 콜로세움 바티칸' },
  { city: '베네치아', country: '이탈리아', countryCode: 'IT', flag: '🇮🇹', lat: 45.4408, lng: 12.3155, aliases: 'venice 베니스' },
  { city: '피렌체', country: '이탈리아', countryCode: 'IT', flag: '🇮🇹', lat: 43.7696, lng: 11.2558, aliases: 'florence 밀라노 아말피' },
  { city: '바르셀로나', country: '스페인', countryCode: 'ES', flag: '🇪🇸', lat: 41.3874, lng: 2.1686, aliases: 'barcelona 가우디' },
  { city: '마드리드', country: '스페인', countryCode: 'ES', flag: '🇪🇸', lat: 40.4168, lng: -3.7038, aliases: 'madrid 세비야 그라나다' },
  { city: '인터라켄', country: '스위스', countryCode: 'CH', flag: '🇨🇭', lat: 46.6863, lng: 7.8632, aliases: 'interlaken 융프라우 그린델발트 취리히 루체른 체르마트' },
  { city: '프라하', country: '체코', countryCode: 'CZ', flag: '🇨🇿', lat: 50.0755, lng: 14.4378, aliases: 'prague 카를교 체스키크룸로프' },
  { city: '부다페스트', country: '헝가리', countryCode: 'HU', flag: '🇭🇺', lat: 47.4979, lng: 19.0402, aliases: 'budapest 국회의사당' },
  { city: '비엔나 (빈)', country: '오스트리아', countryCode: 'AT', flag: '🇦🇹', lat: 48.2082, lng: 16.3738, aliases: 'vienna 잘츠부르크 할슈타트' },
  { city: '뮌헨', country: '독일', countryCode: 'DE', flag: '🇩🇪', lat: 48.1351, lng: 11.5820, aliases: 'munich 프랑크푸르트 베를린' },
  { city: '리스본', country: '포르투갈', countryCode: 'PT', flag: '🇵🇹', lat: 38.7223, lng: -9.1393, aliases: 'lisbon 포르투' },
  { city: '암스테르담', country: '네덜란드', countryCode: 'NL', flag: '🇳🇱', lat: 52.3676, lng: 4.9041, aliases: 'amsterdam' },
  { city: '아테네', country: '그리스', countryCode: 'GR', flag: '🇬🇷', lat: 37.9838, lng: 23.7275, aliases: 'athens 산토리니' },
  { city: '이스탄불', country: '튀르키예', countryCode: 'TR', flag: '🇹🇷', lat: 41.0082, lng: 28.9784, aliases: 'istanbul 터키 카파도키아 안탈리아' },
  { city: '두바이', country: '아랍에미리트', countryCode: 'AE', flag: '🇦🇪', lat: 25.2048, lng: 55.2708, aliases: 'dubai 아부다비' },
];

// 도시/국가 검색 (내장 주요 여행 도시 DB + 온라인 OpenStreetMap Nominatim 지오코딩)
export async function searchWorldCities(query = '') {
  const q = query.trim().toLowerCase();
  if (!q) {
    return WORLD_CITIES_DB.slice(0, 18);
  }

  const localMatches = WORLD_CITIES_DB.filter((item) => {
    const hay = `${item.city} ${item.country} ${item.aliases || ''}`.toLowerCase();
    return hay.includes(q);
  });

  if (typeof navigator !== 'undefined' && navigator.onLine && q.length >= 2) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=ko,en&q=${encodeURIComponent(
        query.trim()
      )}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'ko,en' },
      });
      clearTimeout(timer);
      if (res.ok) {
        const remote = await res.json();
        const remoteCities = remote
          .filter((r) => r.lat && r.lon)
          .map((r) => {
            const addr = r.address || {};
            const cityName =
              addr.city ||
              addr.town ||
              addr.municipality ||
              addr.county ||
              addr.state ||
              r.name ||
              r.display_name.split(',')[0];
            const countryName = addr.country || r.display_name.split(',').pop()?.trim() || '해외';
            const cc = (addr.country_code || '').toUpperCase();
            const flag =
              cc.length === 2
                ? cc.replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
                : '📍';
            return {
              city: cityName,
              country: countryName,
              countryCode: cc || 'XX',
              flag,
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon),
            };
          });

        // 중복 도시명 제거 후 병합
        const seen = new Set(localMatches.map((m) => `${m.city}-${m.country}`));
        const merged = [...localMatches];
        for (const rc of remoteCities) {
          const key = `${rc.city}-${rc.country}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(rc);
          }
        }
        return merged.slice(0, 12);
      }
    } catch {
      // 오프라인 폴백
    }
  }

  return localMatches;
}

// 여행 객체(trip)로부터 방문 도시 목록(다중 도시 지원)과 위경도 좌표를 자동 추출
export function resolveTripCities(trip, allSchedules = []) {
  if (!trip) return [];

  // 1) 이미 명시적으로 저장된 다중 도시 배열(trip.cities)이 있는 경우 우선 사용
  if (Array.isArray(trip.cities) && trip.cities.length > 0) {
    return trip.cities
      .filter((c) => c && c.lat !== undefined && c.lng !== undefined)
      .map((c) => ({
        city: c.city || c.name || trip.destination,
        country: c.country || trip.country || '',
        flag: c.flag || trip.cover_emoji || '📍',
        lat: Number(c.lat),
        lng: Number(c.lng),
      }));
  }

  // 2) destination 및 title 텍스트에서 내장 도시 DB 매칭 (예: "다낭&호이안 3박 4일" -> 다낭, 호이안 2개 도시 모두 자동 추출)
  const searchTarget = `${trip.destination || ''} ${trip.title || ''}`.toLowerCase();
  const matchedCities = WORLD_CITIES_DB.filter((item) => {
    const cityLower = item.city.split(' ')[0].toLowerCase();
    if (searchTarget.includes(cityLower)) return true;
    const aliasTokens = (item.aliases || '').toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
    return aliasTokens.some((tok) => searchTarget.includes(tok));
  });

  if (matchedCities.length > 0) {
    return matchedCities.map((c) => ({
      city: c.city,
      country: c.country,
      flag: c.flag || trip.cover_emoji || '📍',
      lat: c.lat,
      lng: c.lng,
    }));
  }

  // 3) trip.lat / trip.lng 직접 좌표가 있는 경우
  if (trip.lat !== null && trip.lat !== undefined && trip.lng !== null && trip.lng !== undefined) {
    const parts = (trip.destination || '').split(',').map((s) => s.trim());
    return [
      {
        city: parts[0] || trip.title,
        country: trip.country || parts[1] || parts[0] || '여행지',
        flag: trip.cover_emoji || '📍',
        lat: Number(trip.lat),
        lng: Number(trip.lng),
      },
    ];
  }

  // 4) 등록된 세부 일정(schedules) 좌표가 있는 경우 평균 좌표 사용
  const tripScheds = allSchedules.filter(
    (s) => s.trip_id === trip.id && s.lat && s.lng && s.category !== 'memo'
  );
  if (tripScheds.length > 0) {
    const avgLat = tripScheds.reduce((a, b) => a + Number(b.lat), 0) / tripScheds.length;
    const avgLng = tripScheds.reduce((a, b) => a + Number(b.lng), 0) / tripScheds.length;
    const parts = (trip.destination || '').split(',').map((s) => s.trim());
    return [
      {
        city: parts[0] || trip.title,
        country: trip.country || parts[1] || parts[0] || '여행지',
        flag: trip.cover_emoji || '📍',
        lat: Number(avgLat.toFixed(4)),
        lng: Number(avgLng.toFixed(4)),
      },
    ];
  }

  // 5) 국기 이모지로 국가 대표 도시 매칭 폴백
  const byFlag = WORLD_CITIES_DB.find((c) => c.flag === trip.cover_emoji);
  if (byFlag) {
    const parts = (trip.destination || '').split(',').map((s) => s.trim());
    return [
      {
        city: parts[0] || byFlag.city,
        country: trip.country || parts[1] || byFlag.country,
        flag: trip.cover_emoji || byFlag.flag,
        lat: byFlag.lat,
        lng: byFlag.lng,
      },
    ];
  }

  return [];
}

// 추천 A: 나만의 여행 발자취 통계 계산 (방문 국가 수, 방문 도시 수, 총 여행 일수, 누적 비행 거리 km)
export function calculateArchiveFootprintStats(trips = [], allSchedules = []) {
  const countries = new Set();
  const cities = new Set();
  let totalDays = 0;
  let totalFlightKm = 0;

  trips.forEach((trip) => {
    // 여행 일수 합산
    if (trip.start_date && trip.end_date) {
      const s = new Date(`${trip.start_date}T00:00:00`);
      const e = new Date(`${trip.end_date}T00:00:00`);
      const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
      totalDays += days;
    } else {
      totalDays += 1;
    }

    const resolved = resolveTripCities(trip, allSchedules);
    resolved.forEach((c) => {
      if (c.country) countries.add(c.country);
      if (c.city) cities.add(`${c.country}-${c.city}`);
    });

    // 서울/인천 <-> 방문 도시 왕복(및 다중 도시 이동) 거리 계산
    if (resolved.length > 0) {
      const first = resolved[0];
      const last = resolved[resolved.length - 1];
      let tripKm = getDistanceKm(SEOUL_ORIGIN.lat, SEOUL_ORIGIN.lng, first.lat, first.lng);
      for (let i = 0; i < resolved.length - 1; i++) {
        tripKm += getDistanceKm(
          resolved[i].lat,
          resolved[i].lng,
          resolved[i + 1].lat,
          resolved[i + 1].lng
        );
      }
      tripKm += getDistanceKm(last.lat, last.lng, SEOUL_ORIGIN.lat, SEOUL_ORIGIN.lng);
      totalFlightKm += Math.round(tripKm);
    }
  });

  return {
    countryCount: countries.size,
    cityCount: cities.size,
    totalDays,
    totalFlightKm,
    earthRounds: (totalFlightKm / 40075).toFixed(1),
  };
}

// Leaflet JS & CSS 동적 로더 (API Key 불필요, 무료 다크모드 세계지도 타일 렌더링용)
let leafletPromise = null;
export function loadLeafletSdk() {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return Promise.resolve(null);
  }
  if (window.L) {
    return Promise.resolve(window.L);
  }
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve) => {
    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L || null);
    script.onerror = () => {
      leafletPromise = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return leafletPromise;
}
