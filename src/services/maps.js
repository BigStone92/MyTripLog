// 내장 주요 여행지 명소 DB (오프라인 및 API 키 미설정 시 즉시 자동완성 및 좌표 핀 제공)
export const PRESET_PLACES = [
  { place_name: '나리타 국제공항 제1터미널', category: 'transit', lat: 35.7719, lng: 140.3929, address: 'Chiba, Narita, Japan' },
  { place_name: '시부야 스카이 (SHIBUYA SKY)', category: 'spot', lat: 35.6580, lng: 139.7016, address: '2-24-12 Shibuya, Tokyo' },
  { place_name: '이치란 라멘 시부야점', category: 'food', lat: 35.6612, lng: 139.7010, address: '1-22-7 Jinnan, Shibuya' },
  { place_name: '츠키지 장외시장', category: 'food', lat: 35.6655, lng: 139.7707, address: '4 Chome Tsukiji, Chuo, Tokyo' },
  { place_name: '모리 미술관 (롯폰기 힐즈)', category: 'spot', lat: 35.6604, lng: 139.7292, address: '6-10-1 Roppongi, Minato, Tokyo' },
  { place_name: '센소지 (아사쿠사)', category: 'spot', lat: 35.7147, lng: 139.7966, address: '2-3-1 Asakusa, Taito, Tokyo' },
  { place_name: '도쿄 타워', category: 'spot', lat: 35.6586, lng: 139.7454, address: '4-2-8 Shibakoen, Minato, Tokyo' },
  { place_name: '블루보틀 커피 신주쿠점', category: 'cafe', lat: 35.6886, lng: 139.7019, address: '4-1-6 Shinjuku, Tokyo' },
  { place_name: '신주쿠 그레이서리 호텔', category: 'stay', lat: 35.6954, lng: 139.7021, address: '1-19-1 Kabukicho, Shinjuku' },
  { place_name: '제주 국제공항', category: 'transit', lat: 33.5104, lng: 126.4914, address: '제주시 공항로 2' },
  { place_name: '협재 해수욕장', category: 'spot', lat: 33.3943, lng: 126.2397, address: '제주시 한림읍 협재리' },
  { place_name: '애월 카페 노티드 제주', category: 'cafe', lat: 33.4628, lng: 126.3095, address: '제주시 애월읍 애월로1길 24-9' },
  { place_name: '성산 일출봉', category: 'spot', lat: 33.4581, lng: 126.9426, address: '서귀포시 성산읍 성산리' },
  { place_name: '오는정김밥', category: 'food', lat: 33.2523, lng: 126.5618, address: '서귀포시 동문동로 2' },
  { place_name: '간사이 국제공항', category: 'transit', lat: 34.4320, lng: 135.2304, address: 'Izumisano, Osaka, Japan' },
  { place_name: '도톤보리 글리코상', category: 'spot', lat: 34.6687, lng: 135.5013, address: '1-10-2 Dotonbori, Chuo, Osaka' },
  { place_name: '유니버설 스튜디오 재팬 (USJ)', category: 'spot', lat: 34.6654, lng: 135.4323, address: '2-1-33 Sakurajima, Konohana, Osaka' },
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

// 장소 검색 (내장 프리셋 즉시 매칭 + 온라인 시 오픈스트리트맵 지오코딩 결합)
export async function searchPlaceCandidates(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return PRESET_PLACES.slice(0, 6);

  const localMatches = PRESET_PLACES.filter(
    (p) =>
      p.place_name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
  );

  if (typeof navigator !== 'undefined' && navigator.onLine && q.length >= 2) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=4&q=${encodeURIComponent(query)}`,
        { signal: controller.signal, headers: { 'Accept-Language': 'ko,en' } }
      );
      clearTimeout(timer);
      if (res.ok) {
        const remote = await res.json();
        const mapped = remote.map((r) => ({
          place_name: r.name || r.display_name.split(',')[0],
          category: 'spot',
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          address: r.display_name.split(',').slice(0, 3).join(','),
        }));
        return [...localMatches, ...mapped].slice(0, 7);
      }
    } catch {
      // 오프라인 또는 타임아웃 시 내장 프리셋 즉시 반환
    }
  }

  return localMatches;
}
