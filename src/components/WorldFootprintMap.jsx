import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Maximize2,
  Navigation,
  Plane,
  RotateCcw,
} from 'lucide-react';
import {
  SEOUL_ORIGIN,
  calculateArchiveFootprintStats,
  loadLeafletSdk,
  resolveTripCities,
} from '../services/maps.js';

// 두 위경도 좌표 사이의 곡선 비행 항로(Quadratic Bezier Arc) 좌표열 생성
function buildFlightArcPoints(startLat, startLng, endLat, endLng, segments = 28) {
  const midLat = (startLat + endLat) / 2;
  const midLng = (startLng + endLng) / 2;
  const dLat = endLat - startLat;
  const dLng = endLng - startLng;
  const dist = Math.hypot(dLat, dLng);
  // 거리에 비례해 북쪽(위쪽)으로 자연스러운 아크 곡률 부여
  const offsetLat = midLat + Math.min(18, Math.max(2.5, dist * 0.22));
  const offsetLng = midLng;

  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const inv = 1 - t;
    const lat = inv * inv * startLat + 2 * inv * t * offsetLat + t * t * endLat;
    const lng = inv * inv * startLng + 2 * inv * t * offsetLng + t * t * endLng;
    pts.push([lat, lng]);
  }
  return pts;
}

// 오프라인 폴백용 경량 세계 대륙 윤곽선 SVG Path (Equirectangular 0~360 x 0~180 정규화)
function projectToWorldSvg(lat, lng) {
  const x = ((Number(lng) + 180) / 360) * 720;
  const y = ((90 - Number(lat)) / 180) * 360;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

export default function WorldFootprintMap({
  trips = [],
  schedules = [],
  focusedTrip = null,
  onSelectTrip,
  onResetZoom,
  onOpenScheduleDetail,
}) {
  const mapElRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const lastCameraKeyRef = useRef('');
  const [leafletReady, setLeafletReady] = useState(false);
  const [showCityNames, setShowCityNames] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem('mytriplog_show_world_names') !== 'false';
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mytriplog_show_world_names', String(showCityNames));
    }
  }, [showCityNames]);

  // 추천 A: 나만의 여행 발자취 통계 계산
  const stats = useMemo(
    () => calculateArchiveFootprintStats(trips, schedules),
    [trips, schedules]
  );

  // 모든 여행 기록의 방문 도시 핀 목록 추출 (추천 C: 다중 도시 지원)
  const allTripCityPins = useMemo(() => {
    const list = [];
    trips.forEach((trip) => {
      const cities = resolveTripCities(trip, schedules);
      cities.forEach((c, idx) => {
        list.push({
          id: `${trip.id}-city-${idx}`,
          tripId: trip.id,
          trip,
          city: c.city,
          country: c.country,
          flag: c.flag || trip.cover_emoji || '📍',
          lat: Number(c.lat),
          lng: Number(c.lng),
          orderInTrip: idx + 1,
          totalInTrip: cities.length,
        });
      });
    });
    return list;
  }, [trips, schedules]);

  // 현재 클릭하여 확대(Focus)된 여행의 도시 핀 및 세부 일정 장소 핀
  const focusedCities = useMemo(() => {
    if (!focusedTrip) return [];
    return resolveTripCities(focusedTrip, schedules);
  }, [focusedTrip, schedules]);

  const focusedScheduleSpots = useMemo(() => {
    if (!focusedTrip) return [];
    return schedules.filter(
      (s) => s.trip_id === focusedTrip.id && s.lat && s.lng && s.category !== 'memo'
    );
  }, [focusedTrip, schedules]);

  // Leaflet 동적 로드
  useEffect(() => {
    let active = true;
    loadLeafletSdk().then((L) => {
      if (active && L) setLeafletReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Leaflet 지도 인스턴스 초기화
  useEffect(() => {
    if (!leafletReady || !mapElRef.current || !window.L) return;
    if (mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapElRef.current, {
      center: [28, 127],
      zoom: 2,
      minZoom: 1,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    });

    // 공식 OpenStreetMap 표준 타일 + Apple 다크 모드 CSS 인버트 필터 (API Key 영구 불필요, 워터마크 없음)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'osm-dark-tiles',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, [leafletReady]);

  // 핀/항로 렌더링 및 여행 선택 시 부드러운 확대(Fly-To / FitBounds) 제어
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current || !layerGroupRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;

    group.clearLayers();

    // 1) 서울/인천 출발 기준 마커 표시
    const originIcon = L.divIcon({
      className: 'custom-origin-pin',
      html: `<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:rgba(16,185,129,0.22);border:1px solid rgba(52,211,153,0.6);backdrop-filter:blur(8px);color:#a7f3d0;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.45);">🇰🇷 서울/인천</div>`,
      iconSize: [76, 24],
      iconAnchor: [38, 12],
    });
    L.marker([SEOUL_ORIGIN.lat, SEOUL_ORIGIN.lng], { icon: originIcon }).addTo(group);

    // 2) 추천 B: 서울(인천) -> 각 여행지 비행 항로 아크(Flight Arc) 및 다중 도시 연결선
    trips.forEach((trip) => {
      const cities = resolveTripCities(trip, schedules);
      if (cities.length === 0) return;
      const isFocused = focusedTrip?.id === trip.id;

      // 서울 -> 첫 방문 도시 비행 곡선
      const firstCity = cities[0];
      const distFromSeoul = Math.hypot(
        firstCity.lat - SEOUL_ORIGIN.lat,
        firstCity.lng - SEOUL_ORIGIN.lng
      );
      if (distFromSeoul > 0.5) {
        const arcPts = buildFlightArcPoints(
          SEOUL_ORIGIN.lat,
          SEOUL_ORIGIN.lng,
          firstCity.lat,
          firstCity.lng
        );
        L.polyline(arcPts, {
          color: isFocused ? '#c084fc' : '#38bdf8',
          weight: isFocused ? 2.8 : 1.6,
          opacity: isFocused ? 0.9 : 0.45,
          dashArray: isFocused ? null : '5, 6',
        }).addTo(group);
      }

      // 추천 C: 한 여행 내 다중 도시(Multi-City) 간 이동 동선 연결
      if (cities.length > 1) {
        for (let i = 0; i < cities.length - 1; i++) {
          const segPts = [
            [cities[i].lat, cities[i].lng],
            [cities[i + 1].lat, cities[i + 1].lng],
          ];
          L.polyline(segPts, {
            color: isFocused ? '#f472b6' : '#818cf8',
            weight: isFocused ? 3.2 : 2,
            opacity: isFocused ? 0.95 : 0.6,
            dashArray: '4, 4',
          }).addTo(group);
        }
      }
    });

    // 3) 각 여행지(나라&도시) 커스텀 핀 마커 렌더링
    allTripCityPins.forEach((pin) => {
      const isFocused = focusedTrip?.id === pin.tripId;
      const badgeBg = isFocused
        ? 'rgba(168, 85, 247, 0.92)'
        : 'rgba(24, 24, 27, 0.88)';
      const badgeBorder = isFocused
        ? 'rgba(233, 213, 255, 0.95)'
        : 'rgba(56, 189, 248, 0.55)';

      const labelHtml = showCityNames
        ? `
          <div style="
            display:inline-flex;
            align-items:center;
            gap:5px;
            padding:4px 10px;
            border-radius:999px;
            background:${badgeBg};
            border:1.5px solid ${badgeBorder};
            color:#ffffff;
            font-size:11px;
            font-weight:800;
            white-space:nowrap;
            box-shadow:0 6px 16px rgba(0,0,0,0.55);
            transform:${isFocused ? 'scale(1.08)' : 'scale(1)'};
            transition:transform 0.2s ease;
          ">
            <span>${pin.flag}</span>
            <span style="color:${isFocused ? '#faf5ff' : '#bae6fd'};font-weight:700;">${pin.country}</span>
            <span>·</span>
            <span>${pin.city}</span>
            ${
              pin.totalInTrip > 1
                ? `<span style="background:rgba(0,0,0,0.35);padding:1px 5px;border-radius:999px;font-size:9px;">${pin.orderInTrip}</span>`
                : ''
            }
          </div>
        `
        : `
          <div style="
            width:26px;
            height:26px;
            border-radius:999px;
            background:${badgeBg};
            border:1.5px solid ${badgeBorder};
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:13px;
            box-shadow:0 4px 12px rgba(0,0,0,0.5);
            transform:${isFocused ? 'scale(1.2)' : 'scale(1)'};
            transition:transform 0.2s ease;
          ">
            <span>${pin.flag}</span>
          </div>
        `;

      const icon = L.divIcon({
        className: 'custom-trip-city-pin',
        html: labelHtml,
        iconSize: showCityNames ? [130, 28] : [26, 26],
        iconAnchor: showCityNames ? [65, 14] : [13, 13],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(group);
      marker.on('click', () => {
        onSelectTrip?.(pin.trip);
      });
    });

    // 4) 특정 여행이 클릭되어 확대(Focus)된 경우 해당 여행의 세부 스팟 핀도 함께 표시
    if (focusedTrip && focusedScheduleSpots.length > 0) {
      focusedScheduleSpots.forEach((spot, idx) => {
        const spotIcon = L.divIcon({
          className: 'custom-spot-pin',
          html: `
            <div style="
              display:inline-flex;
              align-items:center;
              gap:4px;
              padding:2px 8px;
              border-radius:999px;
              background:rgba(14,165,233,0.9);
              border:1px solid #e0f2fe;
              color:#090d16;
              font-size:10px;
              font-weight:800;
              white-space:nowrap;
              box-shadow:0 4px 10px rgba(0,0,0,0.45);
            ">
              <span>#${idx + 1}</span>
              <span>${spot.place_name}</span>
            </div>
          `,
          iconSize: [100, 22],
          iconAnchor: [50, 11],
        });
        L.marker([Number(spot.lat), Number(spot.lng)], { icon: spotIcon }).addTo(group);
      });
    }

    // 5) 카메라 시점 제어: 특정 여행 클릭 전환 시 해당 도시/스팟으로 부드럽게 확대 (이름 토글 시에는 기존 시점 유지)
    const currentCameraKey = `${focusedTrip?.id || 'world'}_${allTripCityPins.length}`;
    if (lastCameraKeyRef.current !== currentCameraKey) {
      lastCameraKeyRef.current = currentCameraKey;

      if (focusedTrip) {
        const targetPoints = [
          ...focusedCities.map((c) => [Number(c.lat), Number(c.lng)]),
          ...focusedScheduleSpots.map((s) => [Number(s.lat), Number(s.lng)]),
        ];

        if (targetPoints.length === 1) {
          map.flyTo(targetPoints[0], 10, { animate: true, duration: 1.15 });
        } else if (targetPoints.length > 1) {
          const bounds = L.latLngBounds(targetPoints);
          map.flyToBounds(bounds, {
            padding: [48, 48],
            maxZoom: 11,
            animate: true,
            duration: 1.15,
          });
        }
      } else {
        // 세계지도 전체 보기 상태: 방문한 모든 여행지 + 서울이 한눈에 보이도록 맞춤(없으면 세계 전체)
        if (allTripCityPins.length > 0) {
          const allPts = [
            [SEOUL_ORIGIN.lat, SEOUL_ORIGIN.lng],
            ...allTripCityPins.map((p) => [p.lat, p.lng]),
          ];
          const bounds = L.latLngBounds(allPts);
          map.flyToBounds(bounds, {
            padding: [42, 42],
            maxZoom: 5,
            animate: true,
            duration: 0.9,
          });
        } else {
          map.setView([25, 125], 2);
        }
      }
    }
  }, [
    leafletReady,
    trips,
    schedules,
    allTripCityPins,
    focusedTrip,
    focusedCities,
    focusedScheduleSpots,
    onSelectTrip,
    showCityNames,
  ]);

  // 오프라인 SVG 세계지도용 viewBox 계산 (선택된 여행이 있으면 해당 도시 주변으로 확대)
  const svgViewBox = useMemo(() => {
    if (focusedTrip && focusedCities.length > 0) {
      const pts = focusedCities.map((c) => projectToWorldSvg(c.lat, c.lng));
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs) - 36;
      const maxX = Math.max(...xs) + 36;
      const minY = Math.min(...ys) - 22;
      const maxY = Math.max(...ys) + 22;
      const w = Math.max(72, maxX - minX);
      const h = Math.max(40, maxY - minY);
      return `${minX} ${minY} ${w} ${h}`;
    }
    return '0 0 720 360';
  }, [focusedTrip, focusedCities]);

  const seoulSvg = projectToWorldSvg(SEOUL_ORIGIN.lat, SEOUL_ORIGIN.lng);

  return (
    <section className="space-y-3">
      {/* 추천 A: 나만의 여행 발자취 통계 배지 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="glass-card rounded-2xl p-2.5 text-center border border-white/10">
          <span className="block text-[10px] text-zinc-400">방문 국가</span>
          <strong className="text-sm font-extrabold text-purple-300">
            {stats.countryCount}개국
          </strong>
        </div>
        <div className="glass-card rounded-2xl p-2.5 text-center border border-white/10">
          <span className="block text-[10px] text-zinc-400">방문 도시</span>
          <strong className="text-sm font-extrabold text-sky-300">
            {stats.cityCount}곳
          </strong>
        </div>
        <div className="glass-card rounded-2xl p-2.5 text-center border border-white/10">
          <span className="block text-[10px] text-zinc-400">총 여행일</span>
          <strong className="text-sm font-extrabold text-emerald-300">
            {stats.totalDays}일
          </strong>
        </div>
        <div className="glass-card rounded-2xl p-2.5 text-center border border-white/10">
          <span className="block text-[10px] text-zinc-400">누적 비행</span>
          <strong className="text-xs font-extrabold text-amber-300 truncate block">
            {stats.totalFlightKm.toLocaleString()}km
          </strong>
        </div>
      </div>

      {/* 상단 세계지도 & 여행지(나라·도시) 확대 뷰어 카드 */}
      <div className="glass-card rounded-3xl overflow-hidden border border-white/15 shadow-xl">
        {/* 상단 지도 컨트롤 헤더 */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap bg-black/30">
          <div className="flex items-center gap-2 min-w-0">
            {focusedTrip ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/25 border border-purple-400/40 text-xs font-bold text-purple-200 truncate">
                <Maximize2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span className="truncate">
                  {focusedTrip.cover_emoji} {focusedTrip.title} 상세 지도 확대중
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                <span>세계 여행 발자취 지도 (나라 & 도시)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 여행한 곳 이름 표시/숨김 토글 버튼 */}
            <button
              type="button"
              onClick={() => setShowCityNames((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition active:scale-95 border ${
                showCityNames
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 shadow-sm'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
              }`}
              title="지도 내 여행한 곳 이름 표시/숨김 토글"
            >
              {showCityNames ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>이름 켜짐</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                  <span>이름 숨김</span>
                </>
              )}
            </button>

            {focusedTrip ? (
              <>
                <button
                  type="button"
                  onClick={onResetZoom}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-white inline-flex items-center gap-1 transition active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>🌏 세계 전체 보기</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenScheduleDetail?.(focusedTrip)}
                  className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-[11px] font-extrabold text-zinc-950 inline-flex items-center gap-1 transition active:scale-95"
                >
                  <span>일정·가계부 상세</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </>
            ) : (
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Plane className="w-3.5 h-3.5 text-sky-400" />
                <span>아래 여행 기록을 클릭하면 해당 도시가 확대됩니다</span>
              </span>
            )}
          </div>
        </div>

        {/* 지도 캔버스 영역 */}
        <div className="relative w-full h-64 sm:h-72 bg-[#090d16]">
          {leafletReady ? (
            <div ref={mapElRef} className="w-full h-full z-0" />
          ) : (
            /* 오프라인 모드용 인터랙티브 벡터 세계지도 (클릭 시 viewBox 줌인 지원) */
            <svg
              viewBox={svgViewBox}
              className="w-full h-full select-none transition-all duration-700"
              role="img"
              aria-label="세계 여행 발자취 지도"
            >
              <defs>
                <pattern id="world-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path
                    d="M 36 0 L 0 0 0 36"
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.08)"
                    strokeWidth="0.7"
                  />
                </pattern>
              </defs>
              <rect width="720" height="360" fill="url(#world-grid)" />

              {/* 간략 대륙 실루엣 배경 */}
              <g fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8">
                {/* 유라시아 */}
                <path d="M350,55 L460,45 L580,55 L645,95 L615,145 L560,175 L510,165 L455,140 L395,135 L355,105 Z" />
                {/* 아프리카 */}
                <path d="M345,140 L415,140 L440,185 L415,260 L375,265 L350,205 Z" />
                {/* 북미 */}
                <path d="M85,55 L215,50 L245,115 L195,155 L140,145 L95,105 Z" />
                {/* 남미 */}
                <path d="M200,175 L255,190 L245,285 L210,295 L195,225 Z" />
                {/* 오세아니아 */}
                <path d="M565,225 L640,220 L650,275 L580,280 Z" />
              </g>

              {/* 서울(인천)발 비행 아크 */}
              {allTripCityPins.map((pin) => {
                const target = projectToWorldSvg(pin.lat, pin.lng);
                const midX = (seoulSvg.x + target.x) / 2;
                const midY = Math.min(seoulSvg.y, target.y) - 18;
                const isFocused = focusedTrip?.id === pin.tripId;
                return (
                  <path
                    key={`arc-${pin.id}`}
                    d={`M ${seoulSvg.x} ${seoulSvg.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
                    fill="none"
                    stroke={isFocused ? '#c084fc' : '#38bdf8'}
                    strokeWidth={isFocused ? '1.8' : '1'}
                    strokeDasharray={isFocused ? undefined : '4 3'}
                    opacity={isFocused ? 0.95 : 0.55}
                  />
                );
              })}

              {/* 방문 도시 핀 */}
              {allTripCityPins.map((pin) => {
                const pt = projectToWorldSvg(pin.lat, pin.lng);
                const isFocused = focusedTrip?.id === pin.tripId;
                return (
                  <g
                    key={pin.id}
                    onClick={() => onSelectTrip?.(pin.trip)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isFocused ? 7 : 5}
                      fill={isFocused ? '#a855f7' : '#38bdf8'}
                      stroke="#090d16"
                      strokeWidth="1.2"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 7}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={focusedTrip ? '5.5' : '8'}
                      fontWeight="bold"
                    >
                      {pin.flag} {pin.country}·{pin.city}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* 하단 방문 국가·도시 칩 바 (클릭 시 해당 도시로 즉시 줌인) */}
        {allTripCityPins.length > 0 && (
          <div className="px-3.5 py-2.5 bg-black/40 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={onResetZoom}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition shrink-0 ${
                !focusedTrip
                  ? 'bg-sky-500 text-zinc-950 shadow-sm'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              🌏 전체 ({allTripCityPins.length})
            </button>
            {allTripCityPins.map((pin) => {
              const isSelected = focusedTrip?.id === pin.tripId;
              return (
                <button
                  key={pin.id}
                  type="button"
                  onClick={() => onSelectTrip?.(pin.trip)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-purple-500/30 border border-purple-400/60 text-purple-100'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300'
                  }`}
                >
                  <span>{pin.flag}</span>
                  <span className="text-zinc-400">{pin.country}</span>
                  <span>·</span>
                  <span className="font-bold text-white">{pin.city}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
