import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Navigation } from 'lucide-react';
import { calculateTotalRouteKm, loadGoogleMapsSdk } from '../services/maps.js';

export default function RouteMapView({ items = [], activeId, onSelectPin }) {
  const mapContainerRef = useRef(null);
  const [gmapsReady, setGmapsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadGoogleMapsSdk().then((maps) => {
      if (mounted && maps) setGmapsReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Google Maps JS SDK가 활성화된 경우 실제 지도 + 마커 + Polyline 렌더링
  useEffect(() => {
    if (!gmapsReady || !mapContainerRef.current || !window.google?.maps) return;
    const gmaps = window.google.maps;
    const center = items[0]
      ? { lat: Number(items[0].lat), lng: Number(items[0].lng) }
      : { lat: 35.6762, lng: 139.6503 };

    const map = new gmaps.Map(mapContainerRef.current, {
      center,
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#18181b' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#18181b' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#a1a1aa' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#090d16' }] },
      ],
    });

    const bounds = new gmaps.LatLngBounds();
    const path = items.map((item, idx) => {
      const pos = { lat: Number(item.lat), lng: Number(item.lng) };
      bounds.extend(pos);
      const marker = new gmaps.Marker({
        position: pos,
        map,
        label: {
          text: String(idx + 1),
          color: '#0a0a0c',
          fontWeight: 'bold',
        },
        title: item.place_name,
      });
      marker.addListener('click', () => onSelectPin?.(item.id));
      return pos;
    });

    if (path.length > 1) {
      new gmaps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#38bdf8',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        map,
      });
      map.fitBounds(bounds, 40);
    }
  }, [gmapsReady, items, onSelectPin]);

  // SVG 인터랙티브 벡터 동선 맵 좌표 정규화 (오프라인 및 무키 폴백)
  const projected = useMemo(() => {
    if (items.length === 0) return [];
    if (items.length === 1) {
      return [{ ...items[0], x: 180, y: 95, order: 1 }];
    }
    const lats = items.map((i) => Number(i.lat));
    const lngs = items.map((i) => Number(i.lng));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(maxLat - minLat, 0.008);
    const lngSpan = Math.max(maxLng - minLng, 0.008);

    const padX = 48;
    const padY = 34;
    const width = 360 - padX * 2;
    const height = 190 - padY * 2;

    return items.map((item, idx) => {
      const nx = (Number(item.lng) - minLng) / lngSpan;
      const ny = 1 - (Number(item.lat) - minLat) / latSpan;
      return {
        ...item,
        x: Math.round(padX + nx * width),
        y: Math.round(padY + ny * height),
        order: idx + 1,
      };
    });
  }, [items]);

  const totalKm = useMemo(() => calculateTotalRouteKm(items), [items]);

  const googleDirectionsUrl = useMemo(() => {
    if (!items.length) return 'https://www.google.com/maps';
    if (items.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        items[0].place_name
      )}`;
    }
    const origin = encodeURIComponent(items[0].place_name);
    const destination = encodeURIComponent(items[items.length - 1].place_name);
    const waypoints = items
      .slice(1, -1)
      .map((i) => encodeURIComponent(i.place_name))
      .join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ''
    }`;
  }, [items]);

  const polylinePoints = projected.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="glass-card rounded-3xl overflow-hidden border border-white/10">
      {/* 상단 지도 상태 바 */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-white">
            동선 핀 {items.length}곳 · 총 이동 약 {totalKm}km
          </span>
        </div>
        <a
          href={googleDirectionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sky-400 hover:underline font-medium"
        >
          <span>구글맵 경로 열기</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* 지도 캔버스 */}
      {gmapsReady ? (
        <div ref={mapContainerRef} className="w-full h-48 bg-zinc-900" />
      ) : (
        <div className="relative w-full h-48 bg-[#0d131f] overflow-hidden">
          <svg
            viewBox="0 0 360 190"
            className="w-full h-full select-none"
            role="img"
            aria-label="일차별 여행 동선 지도"
          >
            <defs>
              <pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path
                  d="M 30 0 L 0 0 0 30"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.08)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="360" height="190" fill="url(#map-grid)" />

            {/* 동선 연결 선 (Polyline) */}
            {projected.length > 1 && (
              <>
                <polyline
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.25)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              </>
            )}

            {/* 장소 핀 및 번호 */}
            {projected.map((pin) => {
              const isSelected = pin.id === activeId;
              return (
                <g
                  key={pin.id}
                  onClick={() => onSelectPin?.(pin.id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={isSelected ? 16 : 12}
                    fill={isSelected ? 'rgba(56, 189, 248, 0.3)' : 'rgba(14, 165, 233, 0.18)'}
                  />
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r="9.5"
                    fill={isSelected ? '#f59e0b' : '#38bdf8'}
                    stroke="#0a0a0c"
                    strokeWidth="2"
                  />
                  <text
                    x={pin.x}
                    y={pin.y + 3.5}
                    textAnchor="middle"
                    fill="#0a0a0c"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {pin.order}
                  </text>
                  <text
                    x={pin.x}
                    y={pin.y - 14}
                    textAnchor="middle"
                    fill="#e4e4e7"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {pin.place_name.length > 10
                      ? `${pin.place_name.slice(0, 10)}…`
                      : pin.place_name}
                  </text>
                </g>
              );
            })}
          </svg>

          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
              장소를 추가하면 핀과 이동 동선이 지도에 자동 연결됩니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
