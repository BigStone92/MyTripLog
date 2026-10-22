import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  Globe,
  Map as MapIcon,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { loadLeafletSdk, resolveTripCities } from '../services/maps.js';
import {
  COLOR_PALETTE,
  KOREA_MAP_BASE_LABELS,
  KOREA_REGIONS_PRESETS,
  WORLD_MAP_BASE_LABELS,
  buildFallbackPolygon,
  fetchRegionPolygonAndMeta,
  searchColorRegionPresets,
} from '../services/regionColoring.js';
import { getLocalTodayStr, useTripStore } from '../store/useTripStore.js';

export default function ColorMapPage() {
  const mapTopRef = useRef(null);
  const mapElRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseLabelLayerRef = useRef(null);
  const polygonLayerRef = useRef(null);

  const trips = useTripStore((s) => s.trips);
  const schedules = useTripStore((s) => s.schedules);
  const coloredRegions = useTripStore((s) => s.coloredRegions);
  const saveColoredRegion = useTripStore((s) => s.saveColoredRegion);
  const deleteColoredRegion = useTripStore((s) => s.deleteColoredRegion);

  const [leafletReady, setLeafletReady] = useState(false);
  // 추천 B: 국내(대한민국) 집중 뷰 vs 세계 지도 뷰 전환 ('domestic' | 'global')
  const [mapScope, setMapScope] = useState('domestic');
  // 현재 지도에서 클릭하여 확대·팝업 표시 중인 지역 키 (region_key)
  const [selectedRegionKey, setSelectedRegionKey] = useState(null);

  // 날짜 & 지역명 색칠 입력 폼 상태
  const [visitedDate, setVisitedDate] = useState(() => getLocalTodayStr());
  const [regionInput, setRegionInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [memoInput, setMemoInput] = useState('');
  const [isColoring, setIsColoring] = useState(false);
  const [isSyncingFromTrips, setIsSyncingFromTrips] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // 지역명 기준 그룹핑 (추천 A: 동일 지역 다회 방문 시 횟수 합산 및 농도 강화)
  const groupedRegions = useMemo(() => {
    const map = new Map();
    coloredRegions.forEach((item) => {
      const key = item.region_key || `${item.country_name}-${item.region_name}`;
      if (!map.has(key)) {
        map.set(key, {
          region_key: key,
          region_name: item.region_name,
          country_name: item.country_name || '대한민국',
          flag: item.flag || '🇰🇷',
          scope: item.scope || (item.country_name === '대한민국' ? 'domestic' : 'global'),
          color: item.color || '#38bdf8',
          lat: Number(item.lat) || 36.5,
          lng: Number(item.lng) || 127.8,
          geojson:
            item.geojson ||
            buildFallbackPolygon(
              Number(item.lat) || 36.5,
              Number(item.lng) || 127.8,
              item.scope === 'global' ? 0.3 : 0.14
            ),
          visits: [],
        });
      }
      const group = map.get(key);
      // 가장 최근 기록의 색상과 폴리곤을 우선 반영
      if (item.geojson && !group.geojson) {
        group.geojson = item.geojson;
      }
      group.visits.push(item);
    });

    // 방문 날짜 내림차순 정렬
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        visits: g.visits.sort((a, b) => b.visited_date.localeCompare(a.visited_date)),
        visitCount: g.visits.length,
        latestDate: g.visits[0]?.visited_date || '',
      }))
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [coloredRegions]);

  const selectedGroup = useMemo(
    () => groupedRegions.find((g) => g.region_key === selectedRegionKey) || null,
    [groupedRegions, selectedRegionKey]
  );

  // 추천 B: 국내 / 해외 색칠 통계 및 정복률 계산
  const stats = useMemo(() => {
    const domesticGroups = groupedRegions.filter((g) => g.scope === 'domestic');
    const globalGroups = groupedRegions.filter((g) => g.scope === 'global');
    const koreaRate = Math.min(
      100,
      Math.round((domesticGroups.length / KOREA_REGIONS_PRESETS.length) * 100)
    );
    return {
      domesticCount: domesticGroups.length,
      globalCount: globalGroups.length,
      totalRegions: groupedRegions.length,
      totalVisits: coloredRegions.length,
      koreaRate,
    };
  }, [groupedRegions, coloredRegions.length]);

  // 입력 검색어에 따른 한글 지역 추천 칩
  const suggestedPresets = useMemo(
    () => searchColorRegionPresets(regionInput, mapScope),
    [regionInput, mapScope]
  );

  useEffect(() => {
    let active = true;
    loadLeafletSdk().then((L) => {
      if (active && L) setLeafletReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Leaflet 지도 초기화: 외국어 라벨이 전혀 없는 순수 다크 경계선 베이스 타일 사용
  useEffect(() => {
    if (!leafletReady || !mapElRef.current || !window.L) return;
    if (mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapElRef.current, {
      center: [36.35, 127.85],
      zoom: 7,
      minZoom: 2,
      maxZoom: 14,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    });

    // 외국어 텍스트가 없는 순수 다크 지형/행정경계선 베이스 타일 (API Key 불필요, 워터마크 0%)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
      }
    ).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const baseLabelLayer = L.layerGroup().addTo(map);
    const polygonLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    baseLabelLayerRef.current = baseLabelLayer;
    polygonLayerRef.current = polygonLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      baseLabelLayerRef.current = null;
      polygonLayerRef.current = null;
    };
  }, [leafletReady]);

  // 국내(대한민국) <-> 세계 지도 뷰 전환 시 카메라 이동
  const handleSwitchScope = (nextScope) => {
    setMapScope(nextScope);
    setSelectedRegionKey(null);
    if (!mapInstanceRef.current) return;
    if (nextScope === 'domestic') {
      mapInstanceRef.current.flyTo([36.35, 127.85], 7, { animate: true, duration: 0.9 });
    } else {
      mapInstanceRef.current.flyTo([28.0, 125.0], 2, { animate: true, duration: 0.9 });
    }
  };

  // 지도에 (1) 100% 한글 배경 지명 라벨 + (2) 색칠된 지역 다각형(Polygon) + (3) 색칠 지역 한글 배지 렌더링
  useEffect(() => {
    if (
      !leafletReady ||
      !mapInstanceRef.current ||
      !baseLabelLayerRef.current ||
      !polygonLayerRef.current ||
      !window.L
    ) {
      return;
    }

    const L = window.L;
    const baseLabels = baseLabelLayerRef.current;
    const polyGroup = polygonLayerRef.current;

    baseLabels.clearLayers();
    polyGroup.clearLayers();

    const coloredKeys = new Set(groupedRegions.map((g) => g.region_key));

    // 1) 미방문 지역의 배경 한글 지역명 표시 (지도의 모든 지역명이 한글로 표시되도록 보장)
    if (mapScope === 'domestic') {
      KOREA_MAP_BASE_LABELS.forEach((item) => {
        const key = `${item.country_name}-${item.region_name}`;
        if (coloredKeys.has(key)) return; // 이미 색칠된 지역은 아래에서 강조 배지로 표시
        const labelIcon = L.divIcon({
          className: 'korean-base-region-label',
          html: `<div style="
            color:rgba(161,161,170,0.68);
            font-size:10px;
            font-weight:700;
            text-shadow:0 1px 3px rgba(0,0,0,0.95);
            white-space:nowrap;
            pointer-events:auto;
            cursor:pointer;
          ">${item.short_name}</div>`,
          iconSize: [44, 16],
          iconAnchor: [22, 8],
        });
        const m = L.marker([item.lat, item.lng], { icon: labelIcon }).addTo(baseLabels);
        // 배경 한글 지명을 터치하면 즉시 지역 입력창에 채워져서 원클릭 색칠 가능!
        m.on('click', () => {
          setRegionInput(item.region_name);
        });
      });
    } else {
      WORLD_MAP_BASE_LABELS.forEach((item) => {
        const labelIcon = L.divIcon({
          className: 'korean-world-base-label',
          html: `<div style="
            color:rgba(161,161,170,0.72);
            font-size:10px;
            font-weight:700;
            text-shadow:0 1px 4px rgba(0,0,0,0.95);
            white-space:nowrap;
            pointer-events:auto;
            cursor:pointer;
          ">${item.flag} ${item.name}</div>`,
          iconSize: [64, 16],
          iconAnchor: [32, 8],
        });
        const m = L.marker([item.lat, item.lng], { icon: labelIcon }).addTo(baseLabels);
        m.on('click', () => {
          setRegionInput(item.name);
        });
      });
    }

    // 2) 내가 방문하여 색칠한 지역의 행정구역 폴리곤(Polygon) 색칠 & 한글 라벨 배지 렌더링
    groupedRegions.forEach((group) => {
      const isSelected = group.region_key === selectedRegionKey;
      // 추천 A: 방문 횟수(1회, 2회, 3회+)에 따라 색칠 채우기 농도(Opacity) 강화
      const baseOpacity =
        group.visitCount >= 3 ? 0.78 : group.visitCount === 2 ? 0.6 : 0.45;
      const fillOpacity = isSelected ? Math.min(0.9, baseOpacity + 0.15) : baseOpacity;

      if (group.geojson) {
        const geoLayer = L.geoJSON(group.geojson, {
          style: {
            color: isSelected ? '#ffffff' : group.color,
            weight: isSelected ? 3 : 2,
            opacity: 0.95,
            fillColor: group.color,
            fillOpacity,
          },
        }).addTo(polyGroup);

        geoLayer.on('click', () => {
          handleFocusRegionGroup(group);
        });
      }

      // 색칠된 지역 중심에 한글 지역명 + 방문 횟수 배지 표시
      const badgeHtml = `
        <div style="
          display:inline-flex;
          align-items:center;
          gap:4px;
          padding:3px 9px;
          border-radius:999px;
          background:${isSelected ? group.color : 'rgba(18, 18, 22, 0.88)'};
          border:1.5px solid ${isSelected ? '#ffffff' : group.color};
          color:${isSelected ? '#090d16' : '#ffffff'};
          font-size:11px;
          font-weight:800;
          white-space:nowrap;
          box-shadow:0 4px 14px rgba(0,0,0,0.65);
          cursor:pointer;
        ">
          <span>${group.flag}</span>
          <span>${group.region_name}</span>
          ${
            group.visitCount > 1
              ? `<span style="background:rgba(0,0,0,0.3);color:${
                  isSelected ? '#090d16' : '#fde047'
                };padding:0 5px;border-radius:999px;font-size:9px;">${group.visitCount}회</span>`
              : ''
          }
        </div>
      `;

      const badgeIcon = L.divIcon({
        className: 'colored-region-korean-badge',
        html: badgeHtml,
        iconSize: [110, 26],
        iconAnchor: [55, 13],
      });

      const marker = L.marker([group.lat, group.lng], { icon: badgeIcon }).addTo(polyGroup);
      marker.on('click', () => {
        handleFocusRegionGroup(group);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, groupedRegions, mapScope, selectedRegionKey]);

  // 특정 색칠 지역 클릭 시 해당 지역의 색칠 영역으로 지도 확대 (추천 D & E)
  const handleFocusRegionGroup = (group) => {
    if (!group) return;
    setSelectedRegionKey(group.region_key);
    if (group.scope && group.scope !== mapScope) {
      setMapScope(group.scope);
    }

    if (mapInstanceRef.current && window.L) {
      const L = window.L;
      const map = mapInstanceRef.current;
      if (group.geojson) {
        try {
          const tempLayer = L.geoJSON(group.geojson);
          const bounds = tempLayer.getBounds();
          if (bounds.isValid()) {
            map.flyToBounds(bounds, {
              padding: [54, 54],
              maxZoom: 10,
              animate: true,
              duration: 1.0,
            });
            return;
          }
        } catch {
          // 폴백으로 중심 좌표 이동
        }
      }
      map.flyTo([group.lat, group.lng], group.scope === 'domestic' ? 9 : 6, {
        animate: true,
        duration: 1.0,
      });
    }
  };

  // 날짜 + 지역명 입력 후 [해당 지역 색칠하기] 실행
  const handleColorRegionSubmit = async (e, overrideRegionName = null) => {
    if (e) e.preventDefault();
    const targetName = (overrideRegionName ?? regionInput).trim();
    if (!targetName || isColoring) return;

    setIsColoring(true);
    setStatusMessage(`'${targetName}' 행정구역 경계를 찾아 색칠하는 중...`);
    try {
      const meta = await fetchRegionPolygonAndMeta(targetName, mapScope);
      if (!meta) return;

      const saved = await saveColoredRegion({
        region_key: meta.region_key,
        region_name: meta.region_name,
        country_name: meta.country_name,
        flag: meta.flag,
        scope: meta.scope,
        visited_date: visitedDate || getLocalTodayStr(),
        color: selectedColor,
        memo: memoInput.trim(),
        lat: meta.lat,
        lng: meta.lng,
        geojson: meta.geojson,
      });

      setRegionInput('');
      setMemoInput('');
      setSelectedRegionKey(saved.region_key);
      if (meta.scope !== mapScope) {
        setMapScope(meta.scope);
      }
      setStatusMessage(`✨ ${meta.flag} ${meta.region_name} (${visitedDate}) 색칠 완료!`);
      setTimeout(() => setStatusMessage(''), 3000);

      // 방금 색칠한 지역으로 지도 즉시 확대
      setTimeout(() => {
        handleFocusRegionGroup({
          ...meta,
          geojson: meta.geojson,
        });
      }, 120);
    } finally {
      setIsColoring(false);
    }
  };

  // 추천 C: 기존 [홈 / 추억]에 등록된 여행 기록에서 날짜와 도시를 불러와 원클릭 자동 색칠
  const handleSyncFromExistingTrips = async () => {
    if (isSyncingFromTrips || trips.length === 0) return;
    setIsSyncingFromTrips(true);
    setStatusMessage('기존 여행 기록의 방문 지역을 지도에 자동 색칠하는 중...');

    try {
      let addedCount = 0;
      const existingPairs = new Set(
        coloredRegions.map((r) => `${r.region_name}-${r.visited_date}`)
      );

      for (const trip of trips) {
        const cities = resolveTripCities(trip, schedules);
        const dateStr = trip.start_date || getLocalTodayStr();
        for (const c of cities) {
          const meta = await fetchRegionPolygonAndMeta(c.city, 'all');
          if (!meta) continue;
          const pairKey = `${meta.region_name}-${dateStr}`;
          if (existingPairs.has(pairKey)) continue;

          existingPairs.add(pairKey);
          await saveColoredRegion({
            region_key: meta.region_key,
            region_name: meta.region_name,
            country_name: meta.country_name,
            flag: meta.flag,
            scope: meta.scope,
            visited_date: dateStr,
            color: meta.scope === 'domestic' ? '#34d399' : '#38bdf8',
            memo: `${trip.title} 일정 연동`,
            lat: meta.lat,
            lng: meta.lng,
            geojson: meta.geojson,
          });
          addedCount += 1;
        }
      }

      setStatusMessage(
        addedCount > 0
          ? `🎉 기존 여행 기록에서 총 ${addedCount}곳의 지역을 자동으로 색칠했습니다!`
          : '이미 모든 여행 기록의 지역이 지도에 색칠되어 있습니다.'
      );
      setTimeout(() => setStatusMessage(''), 3500);
    } finally {
      setIsSyncingFromTrips(false);
    }
  };

  return (
    <div ref={mapTopRef} className="space-y-4">
      {/* 1. 상단 색칠 정복률 통계 배지 & [국내 / 세계] 뷰 전환 (추천 B & 추천 C) */}
      <section className="space-y-2.5">
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-card rounded-2xl p-2.5 text-center border border-white/10">
            <span className="block text-[10px] text-zinc-400">🇰🇷 국내 색칠 지역</span>
            <strong className="text-sm font-extrabold text-emerald-300">
              {stats.domesticCount}곳{' '}
              <span className="text-[10px] font-semibold text-zinc-400">
                ({stats.koreaRate}%)
              </span>
            </strong>
          </div>
          <div className="glass-card rounded-2xl p-2.5 text-center border border-white/10">
            <span className="block text-[10px] text-zinc-400">🌏 해외 색칠 지역</span>
            <strong className="text-sm font-extrabold text-sky-300">
              {stats.globalCount}곳
            </strong>
          </div>
          <div className="glass-card rounded-2xl p-2.5 text-center border border-white/10">
            <span className="block text-[10px] text-zinc-400">🎨 누적 색칠 기록</span>
            <strong className="text-sm font-extrabold text-purple-300">
              {stats.totalVisits}회
            </strong>
          </div>
        </div>

        {/* [대한민국 지도] <-> [세계 지도] 전환 탭 & [여행 기록 자동 색칠] 버튼 */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex rounded-2xl bg-white/5 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => handleSwitchScope('domestic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                mapScope === 'domestic'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              🇰🇷 대한민국 지도 (한글)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchScope('global')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                mapScope === 'global'
                  ? 'bg-sky-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              🌏 세계 지도 (한글)
            </button>
          </div>

          <button
            type="button"
            onClick={handleSyncFromExistingTrips}
            disabled={isSyncingFromTrips}
            className="px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-[11px] font-bold text-sky-300 inline-flex items-center gap-1.5 transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFromTrips ? 'animate-spin' : ''}`} />
            <span>내 여행 기록 불러와 자동 색칠</span>
          </button>
        </div>
      </section>

      {/* 2. 메인 한글 지역명 색칠 지도 캔버스 */}
      <section className="glass-card rounded-3xl overflow-hidden border border-white/15 shadow-xl">
        <div className="px-4 py-2.5 bg-black/40 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Palette className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {mapScope === 'domestic'
                ? '대한민국 행정구역 색칠 지도 (한글 지명)'
                : '세계 국가·도시 색칠 지도 (한글 지명)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleSwitchScope(mapScope)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-zinc-200 inline-flex items-center gap-1 transition active:scale-95"
          >
            <RotateCcw className="w-3 h-3 text-sky-400" />
            <span>전체 배율 초기화</span>
          </button>
        </div>

        {/* 지도 뷰포트 */}
        <div className="relative w-full h-80 sm:h-96 bg-[#090d16]">
          {leafletReady ? (
            <div ref={mapElRef} className="w-full h-full z-0" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
              한글 색칠 지도를 불러오는 중입니다...
            </div>
          )}
        </div>

        {/* 추천 E: 지도에서 색칠된 지역 터치 시 방문 날짜 목록 & 한 줄 메모 상세 팝업 바 */}
        {selectedGroup && (
          <div className="p-3.5 bg-black/65 border-t border-white/15 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/40"
                  style={{ backgroundColor: selectedGroup.color }}
                />
                <h3 className="text-sm font-extrabold text-white">
                  {selectedGroup.flag} {selectedGroup.country_name} · {selectedGroup.region_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-amber-300">
                  총 {selectedGroup.visitCount}회 색칠됨
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRegionKey(null)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-0.5"
              >
                닫기
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedGroup.visits.map((v) => (
                <div
                  key={v.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-200"
                >
                  <Calendar className="w-3 h-3 text-sky-400" />
                  <span className="font-bold">{v.visited_date}</span>
                  {v.memo && <span className="text-zinc-400">· {v.memo}</span>}
                  <button
                    type="button"
                    onClick={() => deleteColoredRegion(v.id)}
                    title="이 날짜 기록 삭제"
                    className="text-zinc-500 hover:text-rose-400 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. 핵심 3: 날짜와 지역명을 입력하여 해당 지역만 색칠하는 컨트롤 패널 */}
      <section className="glass-card rounded-3xl p-4 border border-white/15 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>날짜 & 지역명 입력하여 지도에 색칠하기</span>
          </h2>
          {statusMessage && (
            <span className="text-[11px] font-bold text-emerald-300 truncate">
              {statusMessage}
            </span>
          )}
        </div>

        <form onSubmit={(e) => handleColorRegionSubmit(e)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[145px_1fr] gap-2.5">
            {/* 방문 날짜 입력 */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                1. 방문 날짜
              </label>
              <input
                type="date"
                value={visitedDate}
                onChange={(e) => setVisitedDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* 한글 지역명 입력 */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                2. 색칠할 지역명 (시·군·구·광역시도 또는 해외 국가·도시)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  placeholder="예: 강릉시, 제주도, 경주시, 여수시, 해운대구, 오사카, 다낭..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </div>

          {/* 한글 지역 빠른 선택 칩 (터치하면 즉시 해당 지역만 색칠되거나 입력됨) */}
          <div className="space-y-1.5">
            <span className="block text-[10px] text-zinc-400">
              빠른 한글 지역 선택 — 아래 지역 칩을 터치하면 선택한 날짜({visitedDate})로 즉시 지도에 색칠됩니다
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {suggestedPresets.map((preset) => {
                const isAlreadyColored = groupedRegions.some(
                  (g) => g.region_name === preset.region_name
                );
                return (
                  <button
                    key={`${preset.country_name}-${preset.region_name}`}
                    type="button"
                    onClick={() => {
                      setRegionInput(preset.region_name);
                      handleColorRegionSubmit(null, preset.region_name);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1 shrink-0 ${
                      isAlreadyColored
                        ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200'
                    }`}
                  >
                    <span>{preset.flag}</span>
                    <span>{preset.short_name}</span>
                    {isAlreadyColored && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 추천 A: 색칠 컬러 선택 & 한 줄 메모 */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-2.5 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-zinc-400 mr-1">색상:</span>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.name}
                  aria-label={`${c.name} 색상 선택`}
                  className={`w-6 h-6 rounded-full transition transform ${
                    selectedColor === c.hex
                      ? 'scale-125 ring-2 ring-white shadow-md'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            <input
              type="text"
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              placeholder="한 줄 메모 (선택, 예: 가족 여행 / 서핑)"
              className="w-full px-3 py-2 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
            />

            <button
              type="submit"
              disabled={!regionInput.trim() || isColoring}
              className="tap-target px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-zinc-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20 shrink-0"
            >
              <Palette className="w-4 h-4" />
              <span>{isColoring ? '색칠 중...' : '해당 지역 색칠하기'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 4. 추천 D: 내가 색칠한 지역 히스토리 카드 리스트 (클릭 시 지도의 해당 색칠 지역으로 확대) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>내가 색칠한 지역 목록 ({groupedRegions.length}곳)</span>
          </h2>
          <span className="text-[11px] text-zinc-400">
            항목을 클릭하면 지도가 해당 색칠 지역으로 확대됩니다
          </span>
        </div>

        {groupedRegions.length === 0 ? (
          <div className="glass-card rounded-3xl p-7 text-center space-y-2 border border-white/10">
            <MapIcon className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-bold text-zinc-200">
              아직 색칠된 지역이 없습니다
            </p>
            <p className="text-xs text-zinc-400">
              위에서 날짜와 지역명(예: 제주도, 강릉시, 부산, 다낭)을 입력하거나 [내 여행 기록 불러와 자동 색칠] 버튼을 눌러보세요!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {groupedRegions.map((group) => {
              const isSelected = group.region_key === selectedRegionKey;
              return (
                <div
                  key={group.region_key}
                  onClick={() => {
                    handleFocusRegionGroup(group);
                    mapTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleFocusRegionGroup(group)}
                  className={`glass-card rounded-2xl p-3.5 flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'ring-2 ring-sky-400 bg-sky-500/10'
                      : 'hover:bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg shrink-0 border border-white/20 shadow-inner"
                      style={{ backgroundColor: `${group.color}33` }}
                    >
                      {group.flag}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-white truncate">
                          {group.region_name}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {group.country_name}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold"
                          style={{
                            backgroundColor: `${group.color}30`,
                            color: group.color,
                          }}
                        >
                          {group.visitCount}회
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        최근 방문: {group.latestDate}
                        {group.visits[0]?.memo ? ` · ${group.visits[0].memo}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      group.visits.forEach((v) => deleteColoredRegion(v.id));
                      if (selectedRegionKey === group.region_key) {
                        setSelectedRegionKey(null);
                      }
                    }}
                    title={`${group.region_name} 색칠 지우기`}
                    aria-label={`${group.region_name} 색칠 지우기`}
                    className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
