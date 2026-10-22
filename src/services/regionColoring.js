import { WORLD_CITIES_DB } from './maps.js';

export const COLOR_PALETTE = [
  { id: 'sky', name: '스카이', hex: '#38bdf8' },
  { id: 'emerald', name: '에메랄드', hex: '#34d399' },
  { id: 'purple', name: '퍼플', hex: '#a855f7' },
  { id: 'amber', name: '앰버', hex: '#f59e0b' },
  { id: 'rose', name: '로즈', hex: '#fb7185' },
  { id: 'indigo', name: '인디고', hex: '#818cf8' },
];

// 대한민국 17개 광역시·도 및 대표 여행 시·군·구 한글 지명 & 중심 좌표 프리셋
export const KOREA_REGIONS_PRESETS = [
  // 광역시·도 (17개)
  { region_name: '서울특별시', short_name: '서울', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.5665, lng: 126.9780, radius: 0.14, query: '서울특별시', aliases: '서울 강남 홍대 성수 잠실 종로 명동 여의도' },
  { region_name: '부산광역시', short_name: '부산', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 35.1796, lng: 129.0756, radius: 0.15, query: '부산광역시', aliases: '부산 해운대 광안리 서면 기장 영도 송정' },
  { region_name: '제주특별자치도', short_name: '제주도', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 33.3846, lng: 126.5535, radius: 0.22, query: '제주특별자치도', aliases: '제주 제주시 서귀포시 애월 협재 성산 우도 중문' },
  { region_name: '인천광역시', short_name: '인천', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.4563, lng: 126.7052, radius: 0.15, query: '인천광역시', aliases: '인천 송도 강화도 영종도 을왕리 월미도' },
  { region_name: '대구광역시', short_name: '대구', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 35.8714, lng: 128.6014, radius: 0.15, query: '대구광역시', aliases: '대구 동성로 수성못 김광석거리' },
  { region_name: '대전광역시', short_name: '대전', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 36.3504, lng: 127.3845, radius: 0.13, query: '대전광역시', aliases: '대전 성심당 둔산 유성' },
  { region_name: '광주광역시', short_name: '광주', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 35.1595, lng: 126.8526, radius: 0.13, query: '광주광역시', aliases: '광주 무등산 양림동' },
  { region_name: '울산광역시', short_name: '울산', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 35.5384, lng: 129.3114, radius: 0.16, query: '울산광역시', aliases: '울산 간절곶 태화강 대왕암' },
  { region_name: '세종특별자치시', short_name: '세종', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 36.4800, lng: 127.2890, radius: 0.11, query: '세종특별자치시', aliases: '세종 호수공원' },
  // 강원 인기 시·군
  { region_name: '강릉시', short_name: '강릉', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.7519, lng: 128.8761, radius: 0.16, query: '강릉시', aliases: '강릉 경포대 안목해변 주문진 정동진' },
  { region_name: '속초시', short_name: '속초', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 38.2070, lng: 128.5918, radius: 0.10, query: '속초시', aliases: '속초 설악산 속초해수욕장 영금정' },
  { region_name: '양양군', short_name: '양양', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 38.0754, lng: 128.6189, radius: 0.14, query: '양양군', aliases: '양양 서피비치 낙산사 하조대' },
  { region_name: '춘천시', short_name: '춘천', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.8813, lng: 127.7298, radius: 0.18, query: '춘천시', aliases: '춘천 남이섬 소양강 삼악산' },
  { region_name: '평창군', short_name: '평창', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.3705, lng: 128.3906, radius: 0.20, query: '평창군', aliases: '평창 대관령 알펜시아 용평' },
  { region_name: '동해시', short_name: '동해', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.5247, lng: 129.1143, radius: 0.11, query: '동해시', aliases: '동해 묵호 추암' },
  { region_name: '삼척시', short_name: '삼척', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.4499, lng: 129.1651, radius: 0.18, query: '삼척시', aliases: '삼척 장호항 환선굴' },
  { region_name: '고성군', short_name: '고성', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 38.3806, lng: 128.4678, radius: 0.14, query: '강원특별자치도 고성군', aliases: '고성 아야진 천진해변 울산바위' },
  { region_name: '정선군', short_name: '정선', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.3806, lng: 128.6608, radius: 0.18, query: '정선군', aliases: '정선 하이원 민둥산' },
  // 경기 인기 시·군
  { region_name: '가평군', short_name: '가평', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.8315, lng: 127.5095, radius: 0.15, query: '가평군', aliases: '가평 자라섬 아침고요수목원 청평' },
  { region_name: '양평군', short_name: '양평', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.4912, lng: 127.4876, radius: 0.15, query: '양평군', aliases: '양평 두물머리 세미원' },
  { region_name: '수원시', short_name: '수원', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.2636, lng: 127.0286, radius: 0.10, query: '수원시', aliases: '수원 행궁동 수원화성 광교' },
  { region_name: '파주시', short_name: '파주', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.7599, lng: 126.7802, radius: 0.14, query: '파주시', aliases: '파주 헤이리 임진각 마장호수' },
  { region_name: '포천시', short_name: '포천', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.8949, lng: 127.2003, radius: 0.16, query: '포천시', aliases: '포천 아트밸리 산정호수' },
  // 경상 인기 시·군
  { region_name: '경주시', short_name: '경주', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 35.8562, lng: 129.2247, radius: 0.19, query: '경주시', aliases: '경주 황리단길 불국사 첨성대 동궁과월지 보문단지' },
  { region_name: '포항시', short_name: '포항', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 36.0190, lng: 129.3435, radius: 0.18, query: '포항시', aliases: '포항 호미곶 영일대 구룡포' },
  { region_name: '안동시', short_name: '안동', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 36.5684, lng: 128.7294, radius: 0.20, query: '안동시', aliases: '안동 하회마을 월영교' },
  { region_name: '울릉군', short_name: '울릉도', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.4844, lng: 130.9057, radius: 0.09, query: '울릉군', aliases: '울릉도 독도' },
  { region_name: '통영시', short_name: '통영', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 34.8544, lng: 128.4332, radius: 0.13, query: '통영시', aliases: '통영 동피랑 루지 욕지도' },
  { region_name: '거제시', short_name: '거제', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 34.8806, lng: 128.6211, radius: 0.14, query: '거제시', aliases: '거제 바람의언덕 외도 매미성' },
  { region_name: '남해군', short_name: '남해', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 34.8377, lng: 127.8924, radius: 0.13, query: '남해군', aliases: '남해 독일마을 다랭이마을' },
  // 전라·충청 인기 시·군
  { region_name: '여수시', short_name: '여수', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 34.7604, lng: 127.6622, radius: 0.15, query: '여수시', aliases: '여수 밤바다 오동도 돌산' },
  { region_name: '순천시', short_name: '순천', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 34.9506, lng: 127.4872, radius: 0.16, query: '순천시', aliases: '순천 순천만 국가정원 낙안읍성' },
  { region_name: '전주시', short_name: '전주', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 35.8242, lng: 127.1480, radius: 0.11, query: '전주시', aliases: '전주 한옥마을 객리단길' },
  { region_name: '군산시', short_name: '군산', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 35.9677, lng: 126.7366, radius: 0.13, query: '군산시', aliases: '군산 선유도 철길마을 이성당' },
  { region_name: '목포시', short_name: '목포', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 34.8118, lng: 126.3922, radius: 0.09, query: '목포시', aliases: '목포 유달산 해상케이블카' },
  { region_name: '담양군', short_name: '담양', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 35.3211, lng: 126.9882, radius: 0.13, query: '담양군', aliases: '담양 죽녹원 메타세콰이어길' },
  { region_name: '단양군', short_name: '단양', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 36.9845, lng: 128.3655, radius: 0.15, query: '단양군', aliases: '단양 도담삼봉 만천하스카이워크 패러글라이딩' },
  { region_name: '제천시', short_name: '제천', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 37.1326, lng: 128.1910, radius: 0.16, query: '제천시', aliases: '제천 의림지 청풍호' },
  { region_name: '태안군', short_name: '태안', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 36.7456, lng: 126.2980, radius: 0.15, query: '태안군', aliases: '태안 안면도 만리포 꽃지해수욕장' },
  { region_name: '보령시', short_name: '보령', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 36.3334, lng: 126.6129, radius: 0.14, query: '보령시', aliases: '보령 대천해수욕장 무창포' },
  { region_name: '공주시', short_name: '공주', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 36.4465, lng: 127.1189, radius: 0.16, query: '공주시', aliases: '공주 공산성 동학사' },
  { region_name: '부여군', short_name: '부여', country_name: '대한민국', flag: '🇰🇷', scope: 'domestic', lat: 36.2755, lng: 126.9098, radius: 0.14, query: '부여군', aliases: '부여 궁남지 낙화암' },
];

// 세계 주요 국가·도시 한글 프리셋 (WORLD_CITIES_DB 연동)
export const GLOBAL_REGIONS_PRESETS = WORLD_CITIES_DB.filter(
  (c) => c.country !== '대한민국'
).map((c) => ({
  region_name: c.city,
  short_name: c.city.split(' ')[0],
  country_name: c.country,
  flag: c.flag,
  scope: 'global',
  lat: c.lat,
  lng: c.lng,
  radius: 0.35,
  query: `${c.city} ${c.country}`,
  aliases: `${c.city} ${c.country} ${c.aliases || ''}`,
}));

export const ALL_COLOR_REGION_PRESETS = [
  ...KOREA_REGIONS_PRESETS,
  ...GLOBAL_REGIONS_PRESETS,
];

// 지도에 항상 한글 지명을 띄우기 위한 배경 기준 한글 라벨 목록
export const KOREA_MAP_BASE_LABELS = KOREA_REGIONS_PRESETS.slice(0, 28);
export const WORLD_MAP_BASE_LABELS = [
  { name: '대한민국', flag: '🇰🇷', lat: 36.5, lng: 127.8 },
  { name: '일본', flag: '🇯🇵', lat: 36.2, lng: 138.2 },
  { name: '중국', flag: '🇨🇳', lat: 35.8, lng: 104.1 },
  { name: '대만', flag: '🇹🇼', lat: 23.7, lng: 121.0 },
  { name: '홍콩', flag: '🇭🇰', lat: 22.3, lng: 114.2 },
  { name: '베트남', flag: '🇻🇳', lat: 15.9, lng: 107.8 },
  { name: '태국', flag: '🇹🇭', lat: 15.2, lng: 101.0 },
  { name: '필리핀', flag: '🇵🇭', lat: 12.8, lng: 121.7 },
  { name: '싱가포르', flag: '🇸🇬', lat: 1.35, lng: 103.8 },
  { name: '말레이시아', flag: '🇲🇾', lat: 4.2, lng: 101.9 },
  { name: '인도네시아', flag: '🇮🇩', lat: -2.5, lng: 118.0 },
  { name: '몽골', flag: '🇲🇳', lat: 46.8, lng: 103.8 },
  { name: '괌', flag: '🇬🇺', lat: 13.4, lng: 144.8 },
  { name: '호주', flag: '🇦🇺', lat: -25.2, lng: 133.7 },
  { name: '뉴질랜드', flag: '🇳🇿', lat: -41.5, lng: 172.5 },
  { name: '미국', flag: '🇺🇸', lat: 38.0, lng: -97.0 },
  { name: '하와이', flag: '🇺🇸', lat: 21.3, lng: -157.8 },
  { name: '캐나다', flag: '🇨🇦', lat: 56.1, lng: -106.3 },
  { name: '영국', flag: '🇬🇧', lat: 54.0, lng: -2.0 },
  { name: '프랑스', flag: '🇫🇷', lat: 46.6, lng: 2.2 },
  { name: '스위스', flag: '🇨🇭', lat: 46.8, lng: 8.2 },
  { name: '이탈리아', flag: '🇮🇹', lat: 42.5, lng: 12.5 },
  { name: '스페인', flag: '🇪🇸', lat: 40.4, lng: -3.7 },
  { name: '독일', flag: '🇩🇪', lat: 51.1, lng: 10.4 },
  { name: '체코', flag: '🇨🇿', lat: 49.8, lng: 15.4 },
  { name: '오스트리아', flag: '🇦🇹', lat: 47.5, lng: 14.5 },
  { name: '헝가리', flag: '🇭🇺', lat: 47.1, lng: 19.5 },
  { name: '튀르키예', flag: '🇹🇷', lat: 39.0, lng: 35.2 },
  { name: '아랍에미리트', flag: '🇦🇪', lat: 24.4, lng: 54.3 },
];

// 오프라인 또는 폴리곤 미제공 지역을 위한 자연스러운 다각형(Polygon) 생성기
export function buildFallbackPolygon(lat, lng, radiusDeg = 0.14) {
  const sides = 18;
  const coords = [];
  const latFactor = Math.max(0.45, Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    // 약간의 자연스러운 굴곡 부여
    const wave = 1 + 0.08 * Math.sin(angle * 3) + 0.05 * Math.cos(angle * 5);
    const dLat = radiusDeg * wave * Math.sin(angle);
    const dLng = (radiusDeg / latFactor) * wave * Math.cos(angle);
    coords.push([Number((lng + dLng).toFixed(5)), Number((lat + dLat).toFixed(5))]);
  }
  return {
    type: 'Polygon',
    coordinates: [coords],
  };
}

// 한글 지역명 자동완성 후보 검색
export function searchColorRegionPresets(query = '', scopeFilter = 'all') {
  const q = query.trim().toLowerCase();
  const baseList =
    scopeFilter === 'domestic'
      ? KOREA_REGIONS_PRESETS
      : scopeFilter === 'global'
      ? GLOBAL_REGIONS_PRESETS
      : ALL_COLOR_REGION_PRESETS;

  if (!q) {
    return baseList.slice(0, 20);
  }

  return baseList.filter((item) => {
    const hay = `${item.region_name} ${item.short_name} ${item.country_name} ${item.aliases || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

// 지역명 입력 시 실제 행정구역 경계(Polygon/MultiPolygon)와 한글 지역명을 조회
export async function fetchRegionPolygonAndMeta(rawInput = '', preferredScope = 'all') {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // 1) 내장 프리셋 일치 여부 먼저 확인
  const qLower = trimmed.toLowerCase();
  const presetMatch = ALL_COLOR_REGION_PRESETS.find(
    (p) =>
      p.region_name.toLowerCase() === qLower ||
      p.short_name.toLowerCase() === qLower ||
      p.region_name.toLowerCase().startsWith(qLower) ||
      (p.aliases && p.aliases.toLowerCase().split(/\s+/).includes(qLower))
  );

  const searchKeyword = presetMatch ? presetMatch.query : trimmed;

  // 2) 온라인 시 OpenStreetMap Nominatim에서 행정구역 Polygon 경계 + 한국어 명칭 조회
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&polygon_threshold=0.004&addressdetails=1&limit=5&accept-language=ko&q=${encodeURIComponent(
        searchKeyword
      )}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'ko' },
      });
      clearTimeout(timer);

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          // Polygon / MultiPolygon 경계를 가진 행정구역 결과를 최우선 선택
          const polyItem =
            list.find(
              (r) =>
                r.geojson &&
                (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon')
            ) || list[0];

          const lat = parseFloat(polyItem.lat);
          const lng = parseFloat(polyItem.lon);
          const addr = polyItem.address || {};
          const cc = (addr.country_code || '').toUpperCase();
          const isKr = cc === 'KR' || presetMatch?.scope === 'domestic';
          const countryName = isKr
            ? '대한민국'
            : presetMatch?.country_name || addr.country || '해외';
          const flag = isKr
            ? '🇰🇷'
            : presetMatch?.flag ||
              (cc.length === 2
                ? cc.replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
                : '📍');

          const regionName =
            presetMatch?.region_name ||
            polyItem.name ||
            addr.city ||
            addr.county ||
            addr.state ||
            trimmed;

          const hasValidPolygon =
            polyItem.geojson &&
            (polyItem.geojson.type === 'Polygon' ||
              polyItem.geojson.type === 'MultiPolygon');

          const geojson = hasValidPolygon
            ? polyItem.geojson
            : buildFallbackPolygon(lat, lng, presetMatch?.radius || (isKr ? 0.14 : 0.3));

          return {
            region_key: `${countryName}-${regionName}`,
            region_name: regionName,
            country_name: countryName,
            flag,
            scope: isKr ? 'domestic' : 'global',
            lat,
            lng,
            geojson,
          };
        }
      }
    } catch {
      // 타임아웃 또는 오프라인 시 아래 프리셋 폴백으로 진행
    }
  }

  // 3) 오프라인 또는 네트워크 차단 시 프리셋 데이터 기반 폴리곤 즉시 생성
  if (presetMatch) {
    return {
      region_key: `${presetMatch.country_name}-${presetMatch.region_name}`,
      region_name: presetMatch.region_name,
      country_name: presetMatch.country_name,
      flag: presetMatch.flag,
      scope: presetMatch.scope,
      lat: presetMatch.lat,
      lng: presetMatch.lng,
      geojson: buildFallbackPolygon(presetMatch.lat, presetMatch.lng, presetMatch.radius || 0.15),
    };
  }

  // 4) 프리셋에도 없는 임의 지역명 오프라인 입력 시 기본 좌표 폴백
  const isDomestic = preferredScope !== 'global';
  return {
    region_key: `${isDomestic ? '대한민국' : '해외'}-${trimmed}`,
    region_name: trimmed,
    country_name: isDomestic ? '대한민국' : '해외',
    flag: isDomestic ? '🇰🇷' : '🌍',
    scope: isDomestic ? 'domestic' : 'global',
    lat: isDomestic ? 36.5 : 35.6762,
    lng: isDomestic ? 127.8 : 139.6503,
    geojson: buildFallbackPolygon(isDomestic ? 36.5 : 35.6762, isDomestic ? 127.8 : 139.6503, 0.15),
  };
}
