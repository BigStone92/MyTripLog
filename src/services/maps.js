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
