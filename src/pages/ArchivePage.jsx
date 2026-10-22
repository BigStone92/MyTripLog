import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  Globe,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import DateRangePicker from '../components/DateRangePicker';
import WorldFootprintMap from '../components/WorldFootprintMap';
import {COUNTRY_TO_CURRENCY, searchFlagsAndIcons} from '../services/countries.js';
import {
  resolveTripCities,
  searchWorldCities,
} from '../services/maps.js';
import {
  calculateDday,
  formatCommaNumber,
  isTripPast,
  makeId,
  stripCommaNumber,
  useTripStore,
} from '../store/useTripStore';

const CURRENT_YEAR = new Date().getFullYear();
const PAST_YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DURATION_PRESETS = [
  { label: '당일치기', days: 1 },
  { label: '1박 2일', days: 2 },
  { label: '2박 3일', days: 3 },
  { label: '3박 4일', days: 4 },
  { label: '4박 5일', days: 5 },
  { label: '5박 6일', days: 6 },
  { label: '6박 7일', days: 7 },
  { label: '9박 10일', days: 10 },
];

// 로컬 사진 파일을 오프라인/SQLite 저장에 적합하도록 경량 JPEG DataURL로 리사이즈
function compressImageFile(file, maxWidth = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildDatesFromYearMonth(year, month, durationDays = 4) {
  const m = String(month).padStart(2, '0');
  const startStr = `${year}-${m}-10`;
  const startObj = new Date(`${startStr}T00:00:00`);
  startObj.setDate(startObj.getDate() + Math.max(0, durationDays - 1));
  const ey = startObj.getFullYear();
  const em = String(startObj.getMonth() + 1).padStart(2, '0');
  const ed = String(startObj.getDate()).padStart(2, '0');
  return { start_date: startStr, end_date: `${ey}-${em}-${ed}` };
}

function createInitialPastTripForm() {
  const defaultYear = CURRENT_YEAR - 1;
  const { start_date, end_date } = buildDatesFromYearMonth(defaultYear, 5, 4);
  return {
    title: '',
    destination: '',
    country: '',
    cities: [],
    start_date,
    end_date,
    total_budget: 1000000,
    currency: 'KRW',
    cover_emoji: '✈️',
    memo: '',
    quickYear: defaultYear,
    quickMonth: 5,
    quickDuration: 4,
    dateMode: 'quick', // 'quick' (연도·월 간편 선택) | 'calendar' (정확한 날짜 달력)
  };
}

export default function ArchivePage() {
  const navigate = useNavigate();
  const mapTopRef = useRef(null);

  const trips = useTripStore((s) => s.trips);
  const schedules = useTripStore((s) => s.schedules);
  const expenses = useTripStore((s) => s.expenses);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const setActiveTripId = useTripStore((s) => s.setActiveTripId);
  const saveTrip = useTripStore((s) => s.saveTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);

  // 추억: 여행 기간이 지났거나(end_date < 오늘) 완료 처리된 지난 여행 일정만 표시
  const pastTrips = useMemo(
    () =>
      trips
        .filter((t) => isTripPast(t))
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [trips]
  );

  // 상단 세계지도에서 현재 확대(Zoom-in)된 여행 ID (초기 진입 시 null = 세계 전체 보기)
  const [focusedTripId, setFocusedTripId] = useState(null);

  const focusedTrip = useMemo(
    () => pastTrips.find((t) => t.id === focusedTripId) || null,
    [pastTrips, focusedTripId]
  );

  // 하단 회고록/사진 갤러리에 연결된 활성 여행
  const activeTrip =
    focusedTrip ||
    pastTrips.find((t) => t.id === activeTripId) ||
    pastTrips[0] ||
    null;

  const [memoDraft, setMemoDraft] = useState(activeTrip?.memo || '');
  const [savedNotice, setSavedNotice] = useState(false);

  // 사진 추가 바텀 시트 상태
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [photoForm, setPhotoForm] = useState({ caption: '', url: '' });

  // 과거(개발 이전 포함) 여행 기록 추가/수정 바텀 시트 상태
  const [isTripSheetOpen, setIsTripSheetOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [tripForm, setTripForm] = useState(() => createInitialPastTripForm());
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);

  // 도시 검색 (내장 주요 여행 도시 DB + 온라인 OpenStreetMap 지오코딩)
  useEffect(() => {
    let active = true;
    setIsSearchingCities(true);
    const timer = setTimeout(() => {
      searchWorldCities(cityQuery).then((res) => {
        if (active) {
          setCityResults(res);
          setIsSearchingCities(false);
        }
      });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cityQuery]);

  // 활성 여행 변경 시 메모 동기화
  useEffect(() => {
    if (activeTrip) {
      setMemoDraft(activeTrip.memo || '');
    }
  }, [activeTrip?.id]);

  // 여행 기록 카드 클릭 -> 상단 세계지도에서 해당 여행지(나라&도시)로 자세히 확대!
  const handleSelectTripForMapZoom = (trip) => {
    if (!trip) return;
    setActiveTripId(trip.id);
    setMemoDraft(trip.memo || '');
    setFocusedTripId((prev) => (prev === trip.id ? prev : trip.id));
    mapTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // 상세 일정·가계부 페이지(/schedule)로 이동
  const handleEnterPastTripDetail = (trip) => {
    if (!trip) return;
    setActiveTripId(trip.id);
    setMemoDraft(trip.memo || '');
    navigate('/schedule');
  };

  // 과거 여행 신규 추가 모달 열기
  const openAddPastTripModal = () => {
    setEditingTripId(null);
    setTripForm(createInitialPastTripForm());
    setCityQuery('');
    setIsTripSheetOpen(true);
  };

  // 기존 과거 여행 수정 모달 열기
  const openEditPastTripModal = (trip) => {
    const resolvedCities = resolveTripCities(trip, schedules);
    const [sy, sm] = (trip.start_date || '2023-05-10').split('-').map(Number);
    setEditingTripId(trip.id);
    setTripForm({
      title: trip.title || '',
      destination: trip.destination || '',
      country: trip.country || resolvedCities[0]?.country || '',
      cities: resolvedCities,
      start_date: trip.start_date,
      end_date: trip.end_date || trip.start_date,
      total_budget: trip.total_budget || 1000000,
      currency: trip.currency || 'KRW',
      cover_emoji: trip.cover_emoji || resolvedCities[0]?.flag || '✈️',
      memo: trip.memo || '',
      quickYear: sy || CURRENT_YEAR - 1,
      quickMonth: sm || 5,
      quickDuration: 4,
      dateMode: 'calendar',
    });
    setCityQuery('');
    setIsTripSheetOpen(true);
  };

  // 추천 C: 방문 도시(나라&도시) 태그 추가 (한 여행에 여러 도시 등록 가능)
  const handleAddCityTag = (cityItem) => {
    setTripForm((prev) => {
      const exists = prev.cities.some(
        (c) => c.city === cityItem.city && c.country === cityItem.country
      );
      const nextCities = exists
        ? prev.cities
        : [
            ...prev.cities,
            {
              city: cityItem.city,
              country: cityItem.country,
              flag: cityItem.flag || '📍',
              lat: Number(cityItem.lat),
              lng: Number(cityItem.lng),
            },
          ];

      const uniqueCountries = [...new Set(nextCities.map((c) => c.country).filter(Boolean))];
      const cityNames = nextCities.map((c) => c.city).join(' · ');
      const countryLabel = uniqueCountries.join('·');
      const autoDestination = countryLabel ? `${cityNames}, ${countryLabel}` : cityNames;
      const autoCurrency =
        (cityItem.countryCode && COUNTRY_TO_CURRENCY[cityItem.countryCode]) || prev.currency;

      return {
        ...prev,
        cities: nextCities,
        country: countryLabel || cityItem.country,
        destination: autoDestination,
        cover_emoji: nextCities[0]?.flag || cityItem.flag || prev.cover_emoji,
        currency: autoCurrency || prev.currency,
      };
    });
    setCityQuery('');
  };

  const handleRemoveCityTag = (idxToRemove) => {
    setTripForm((prev) => {
      const nextCities = prev.cities.filter((_, idx) => idx !== idxToRemove);
      const uniqueCountries = [...new Set(nextCities.map((c) => c.country).filter(Boolean))];
      const cityNames = nextCities.map((c) => c.city).join(' · ');
      const countryLabel = uniqueCountries.join('·');
      return {
        ...prev,
        cities: nextCities,
        country: countryLabel,
        destination:
          nextCities.length > 0
            ? `${cityNames}, ${countryLabel}`
            : prev.destination,
        cover_emoji: nextCities[0]?.flag || prev.cover_emoji,
      };
    });
  };

  const handleQuickDateChange = (nextYear, nextMonth, nextDuration) => {
    const { start_date, end_date } = buildDatesFromYearMonth(
      nextYear,
      nextMonth,
      nextDuration
    );
    setTripForm((prev) => ({
      ...prev,
      quickYear: nextYear,
      quickMonth: nextMonth,
      quickDuration: nextDuration,
      start_date,
      end_date,
    }));
  };

  const handleSavePastTrip = async (e) => {
    e.preventDefault();
    const hasCities = tripForm.cities.length > 0;
    const finalDestination =
      tripForm.destination.trim() ||
      (hasCities
        ? `${tripForm.cities.map((c) => c.city).join(' · ')}, ${tripForm.country}`
        : '');

    if (!finalDestination && !tripForm.title.trim()) return;

    const autoTitle =
      tripForm.title.trim() ||
      (hasCities
        ? `${tripForm.cities.map((c) => c.city).join('&')} 여행`
        : `${finalDestination} 여행`);

    // 만약 도시 태그 없이 텍스트로만 입력한 경우에도 국가/도시 좌표 추론 시도
    let finalCities = tripForm.cities;
    let finalEmoji = tripForm.cover_emoji;
    if (finalCities.length === 0 && finalDestination) {
      const candidates = await searchWorldCities(finalDestination);
      if (candidates.length > 0) {
        finalCities = [
          {
            city: candidates[0].city,
            country: candidates[0].country,
            flag: candidates[0].flag,
            lat: candidates[0].lat,
            lng: candidates[0].lng,
          },
        ];
        if (finalEmoji === '✈️') finalEmoji = candidates[0].flag;
      } else {
        const flagMatch = searchFlagsAndIcons(finalDestination)[0];
        if (flagMatch && finalEmoji === '✈️') finalEmoji = flagMatch.emoji;
      }
    }

    const primaryCity = finalCities[0] || null;
    const saved = await saveTrip({
      id: editingTripId || undefined,
      title: autoTitle,
      destination: finalDestination || autoTitle,
      country: tripForm.country || primaryCity?.country || '',
      cities: finalCities,
      lat: primaryCity ? Number(primaryCity.lat) : null,
      lng: primaryCity ? Number(primaryCity.lng) : null,
      start_date: tripForm.start_date,
      end_date: tripForm.end_date || tripForm.start_date,
      total_budget: tripForm.total_budget,
      currency: tripForm.currency || 'KRW',
      cover_emoji: finalEmoji || '✈️',
      status: 'completed',
      memo: tripForm.memo || '',
    });

    setIsTripSheetOpen(false);
    if (saved?.id) {
      // 저장 직후 방금 등록한 여행지로 세계지도 즉시 확대!
      setFocusedTripId(saved.id);
      setActiveTripId(saved.id);
      mapTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRestoreToHome = async (trip) => {
    await saveTrip({ ...trip, status: 'planned' });
    if (focusedTripId === trip.id) setFocusedTripId(null);
  };

  const handleSaveMemo = async () => {
    if (!activeTrip) return;
    await saveTrip({ ...activeTrip, memo: memoDraft });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImageFile(file);
    setPhotoForm((prev) => ({ ...prev, url: dataUrl }));
  };

  const handleAddPhoto = async (e) => {
    e.preventDefault();
    if (!activeTrip || !photoForm.url) return;
    const newPhoto = {
      id: makeId('photo'),
      caption: photoForm.caption.trim() || `${activeTrip.destination}의 순간`,
      date: new Date().toISOString().slice(0, 10),
      url: photoForm.url,
    };
    const nextPhotos = [newPhoto, ...(activeTrip.photos || [])];
    await saveTrip({ ...activeTrip, photos: nextPhotos });
    setPhotoForm({ caption: '', url: '' });
    setIsPhotoSheetOpen(false);
  };

  const handleDeletePhoto = async (photoId) => {
    if (!activeTrip) return;
    const nextPhotos = (activeTrip.photos || []).filter((p) => p.id !== photoId);
    await saveTrip({ ...activeTrip, photos: nextPhotos });
  };

  const tripTotalSpent = expenses
    .filter((e) => e.trip_id === activeTrip?.id)
    .reduce((acc, cur) => acc + (cur.krw_amount || 0), 0);

  return (
    <div ref={mapTopRef} className="space-y-5">
      {/* 0. 최상단: 세계지도 & 여행지(나라·도시) 발자취 뷰어 (클릭 시 도시 상세 확대) */}
      <WorldFootprintMap
        trips={pastTrips}
        schedules={schedules}
        focusedTrip={focusedTrip}
        onSelectTrip={handleSelectTripForMapZoom}
        onResetZoom={() => setFocusedTripId(null)}
        onOpenScheduleDetail={handleEnterPastTripDetail}
      />

      {/* 1. 지난 여행 기록 리스트 (개발 이전 여행 추가 지원 + 클릭 시 세계지도 확대) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>추억 · 지난 여행 기록 ({pastTrips.length})</span>
            </h1>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              기록을 클릭하면 상단 세계지도가 해당 나라·도시로 확대됩니다
            </p>
          </div>

          <button
            type="button"
            onClick={openAddPastTripModal}
            className="tap-target inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-purple-500 hover:bg-purple-400 text-zinc-950 font-extrabold text-xs shadow-lg shadow-purple-500/20 shrink-0 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>과거 여행 추가</span>
          </button>
        </div>

        {pastTrips.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center space-y-3 border border-white/10">
            <Globe className="w-9 h-9 text-purple-400 mx-auto" />
            <p className="text-sm font-bold text-zinc-100">
              첫 번째 추억 여행지를 세계지도에 남겨보세요
            </p>
            <p className="text-xs text-zinc-400">
              앱 개발 이전에 다녀왔던 해외·국내 여행도 나라와 도시만 선택해 간편하게 기록할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={openAddPastTripModal}
              className="tap-target inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold text-xs shadow-lg shadow-purple-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>개발 이전 과거 여행 기록하기</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pastTrips.map((trip) => {
              const badge = calculateDday(trip.start_date, trip.end_date);
              const isMapZoomed = focusedTrip?.id === trip.id;
              const isSelected = activeTrip?.id === trip.id;
              const cities = resolveTripCities(trip, schedules);

              return (
                <div
                  key={trip.id}
                  onClick={() => handleSelectTripForMapZoom(trip)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTripForMapZoom(trip)}
                  className={`glass-card rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                    isMapZoomed
                      ? 'ring-2 ring-purple-400 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                      : isSelected
                      ? 'border border-purple-400/40 bg-purple-500/5'
                      : 'hover:bg-white/5 opacity-95'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                      {trip.cover_emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-purple-300">
                          {trip.start_date?.slice(0, 4)}년
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {trip.start_date} ~ {trip.end_date}
                        </span>
                        {isMapZoomed && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/50 text-[10px] font-bold text-purple-200">
                            🔍 지도 확대중
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white truncate mt-0.5">
                        {trip.title}
                      </h3>

                      {/* 방문 나라 & 다중 도시 배지 표시 */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {cities.length > 0 ? (
                          cities.map((c, idx) => (
                            <span
                              key={`${trip.id}-c-${idx}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-sky-200 font-semibold"
                            >
                              <span>{c.flag}</span>
                              <span className="text-zinc-400">{c.country}</span>
                              <span>·</span>
                              <span>{c.city}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400 truncate">
                            {trip.destination}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500">
                          · 사진 {(trip.photos || []).length}장 · {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnterPastTripDetail(trip);
                      }}
                      className="tap-target inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-[11px] font-bold text-sky-300 hover:bg-sky-500/25"
                    >
                      <span>일정 상세</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPastTripModal(trip);
                      }}
                      title="여행 정보 및 방문 도시 수정"
                      aria-label={`${trip.title} 수정`}
                      className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {trip.status === 'completed' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreToHome(trip);
                        }}
                        title="예정 여행(홈)으로 되돌리기"
                        className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-sky-400 hover:bg-white/10"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (focusedTripId === trip.id) setFocusedTripId(null);
                        deleteTrip(trip.id);
                      }}
                      aria-label={`${trip.title} 삭제`}
                      className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {activeTrip && (
        <>
          {/* 2. 선택된 지난 여행 요약 및 텍스트 회고록 메모장 */}
          <section className="glass-card rounded-3xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                  추억 회고록 & 앨범
                </span>
                <h2 className="text-lg font-bold text-white mt-1">
                  {activeTrip.cover_emoji} {activeTrip.title}
                </h2>
                <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    {activeTrip.destination}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    {activeTrip.start_date} ~ {activeTrip.end_date}
                  </span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] text-zinc-400">총 지출 기록</span>
                <p className="text-sm font-bold text-emerald-400">
                  ₩{(tripTotalSpent || activeTrip.total_budget || 0).toLocaleString()}
                </p>
                <button
                  type="button"
                  onClick={() => handleEnterPastTripDetail(activeTrip)}
                  className="mt-1 text-[11px] font-semibold text-sky-400 hover:underline"
                >
                  일정 상세 보기 →
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label htmlFor="archive-memo" className="text-xs font-semibold text-zinc-300">
                  나만의 여행 기록 & 메모
                </label>
                <button
                  type="button"
                  onClick={handleSaveMemo}
                  className="tap-target inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 text-xs font-medium"
                >
                  {savedNotice ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>저장됨</span>
                    </>
                  ) : (
                    <span>메모 저장</span>
                  )}
                </button>
              </div>
              <textarea
                id="archive-memo"
                rows={4}
                value={memoDraft}
                onChange={(e) => setMemoDraft(e.target.value)}
                placeholder="가장 기억에 남는 장소, 음식, 함께한 사람들과의 추억을 기록해 보세요."
                className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-zinc-100 leading-relaxed focus:outline-none focus:border-purple-400"
              />
            </div>
          </section>

          {/* 3. 추억 사진 갤러리 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-sky-400" />
                <span>추억 스냅샷 ({(activeTrip.photos || []).length})</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsPhotoSheetOpen(true)}
                className="tap-target inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                <span>사진 추가</span>
              </button>
            </div>

            {(!activeTrip.photos || activeTrip.photos.length === 0) ? (
              <div className="glass-card rounded-3xl p-8 text-center space-y-2">
                <Camera className="w-8 h-8 text-zinc-500 mx-auto" />
                <p className="text-sm font-medium text-zinc-300">아직 등록된 추억 사진이 없습니다</p>
                <p className="text-xs text-zinc-500">
                  아이폰/갤러리 사진을 올리면 오프라인에서도 언제든 꺼내볼 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {activeTrip.photos.map((photo) => (
                  <article
                    key={photo.id}
                    className="glass-card rounded-3xl overflow-hidden border border-white/10"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      loading="lazy"
                      className="w-full h-52 object-cover bg-zinc-900"
                    />
                    <div className="p-3.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{photo.caption}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{photo.date}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        aria-label="사진 삭제"
                        className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* 과거(개발 이전 포함) 여행 기록 추가/수정 바텀 시트 */}
      <BottomSheet
        isOpen={isTripSheetOpen}
        onClose={() => setIsTripSheetOpen(false)}
        title={editingTripId ? '과거 여행 기록 수정' : '과거 여행 기록 추가 (세계지도 핀 등록)'}
      >
        <form onSubmit={handleSavePastTrip} className="space-y-4">
          {/* 1. 방문 나라 & 도시 검색 및 다중 도시 태그 등록 (추천 C) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-200">
              1. 다녀온 나라 & 도시 선택 (여러 도시 추가 가능)
            </label>

            {/* 선택된 방문 도시 태그 리스트 */}
            {tripForm.cities.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-2xl bg-purple-500/10 border border-purple-400/30">
                {tripForm.cities.map((c, idx) => (
                  <span
                    key={`${c.city}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/25 border border-purple-400/40 text-xs font-bold text-white"
                  >
                    <span>{c.flag}</span>
                    <span className="text-purple-200">{c.country}</span>
                    <span>·</span>
                    <span>{c.city}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCityTag(idx)}
                      className="text-zinc-300 hover:text-rose-300 ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 나라/도시 검색 입력창 */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="도시 또는 나라 검색 (예: 오사카, 교토, 파리, 다낭, 하와이, 제주...)"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* 검색된 나라·도시 추천 칩 */}
            <div className="max-h-36 overflow-y-auto p-2 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-zinc-400">
                  {cityQuery.trim()
                    ? `'${cityQuery}' 검색 결과 (${cityResults.length}곳) — 터치하면 추가됩니다`
                    : '인기 여행지 빠른 선택 — 여러 도시를 연속해서 터치해 보세요'}
                </span>
                {isSearchingCities && (
                  <span className="text-[10px] text-purple-300">검색중...</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cityResults.map((item, idx) => {
                  const isAdded = tripForm.cities.some(
                    (c) => c.city === item.city && c.country === item.country
                  );
                  return (
                    <button
                      key={`${item.city}-${item.country}-${idx}`}
                      type="button"
                      onClick={() => handleAddCityTag(item)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition active:scale-95 ${
                        isAdded
                          ? 'bg-purple-500 text-zinc-950 font-extrabold'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200'
                      }`}
                    >
                      <span>{item.flag}</span>
                      <span className={isAdded ? 'text-zinc-900' : 'text-zinc-400'}>
                        {item.country}
                      </span>
                      <span>·</span>
                      <span>{item.city}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. 여행 제목 (미입력 시 선택한 도시명으로 자동 생성) */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-1">
              2. 여행 제목 <span className="text-zinc-500 font-normal">(비워두면 도시명으로 자동 생성)</span>
            </label>
            <input
              type="text"
              placeholder={
                tripForm.cities.length > 0
                  ? `예: ${tripForm.cities.map((c) => c.city).join('&')} 추억 여행`
                  : '예: 2019 오사카 & 교토 미식 여행'
              }
              value={tripForm.title}
              onChange={(e) => setTripForm({ ...tripForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* 3. 여행 시기 선택 (연도·월 간편 선택 vs 정확한 달력 선택) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200">3. 여행 시기</label>
              <div className="inline-flex rounded-xl bg-white/5 p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setTripForm((p) => ({ ...p, dateMode: 'quick' }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    tripForm.dateMode === 'quick'
                      ? 'bg-purple-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  연도·월 간편 선택
                </button>
                <button
                  type="button"
                  onClick={() => setTripForm((p) => ({ ...p, dateMode: 'calendar' }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    tripForm.dateMode === 'calendar'
                      ? 'bg-purple-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  달력 날짜 지정
                </button>
              </div>
            </div>

            {tripForm.dateMode === 'quick' ? (
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] text-zinc-400 mb-1">방문 연도 (1990~현재)</span>
                    <select
                      value={tripForm.quickYear}
                      onChange={(e) =>
                        handleQuickDateChange(
                          Number(e.target.value),
                          tripForm.quickMonth,
                          tripForm.quickDuration
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-bold text-white"
                    >
                      {PAST_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}년
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 mb-1">방문 월</span>
                    <select
                      value={tripForm.quickMonth}
                      onChange={(e) =>
                        handleQuickDateChange(
                          tripForm.quickYear,
                          Number(e.target.value),
                          tripForm.quickDuration
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-bold text-white"
                    >
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}월
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] text-zinc-400 mb-1">여행 기간</span>
                  <div className="flex flex-wrap gap-1.5">
                    {DURATION_PRESETS.map((d) => (
                      <button
                        key={d.days}
                        type="button"
                        onClick={() =>
                          handleQuickDateChange(
                            tripForm.quickYear,
                            tripForm.quickMonth,
                            d.days
                          )
                        }
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition ${
                          tripForm.quickDuration === d.days
                            ? 'bg-purple-500 text-zinc-950 font-extrabold'
                            : 'bg-white/5 text-zinc-300 border border-white/10'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <DateRangePicker
                startDate={tripForm.start_date}
                endDate={tripForm.end_date}
                onConfirm={(s, e) =>
                  setTripForm((prev) => ({
                    ...prev,
                    start_date: s,
                    end_date: e,
                  }))
                }
                onCancel={() => setTripForm((prev) => ({ ...prev, dateMode: 'quick' }))}
              />
            )}
          </div>

          {/* 4. 총 여행 경비 & 한 줄 회고 메모 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-200 mb-1">
                대략적인 총 지출 경비 (원, 선택)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatCommaNumber(tripForm.total_budget)}
                onChange={(e) =>
                  setTripForm({
                    ...tripForm,
                    total_budget: stripCommaNumber(e.target.value),
                  })
                }
                placeholder="1,000,000"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-200 mb-1">
                기억에 남는 한 줄 메모 (선택)
              </label>
              <input
                type="text"
                value={tripForm.memo}
                onChange={(e) => setTripForm({ ...tripForm, memo: e.target.value })}
                placeholder="예: 도톤보리 야경과 온천이 최고였던 여행"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={tripForm.cities.length === 0 && !tripForm.title.trim() && !tripForm.destination.trim()}
            className="tap-target w-full py-3.5 rounded-2xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-zinc-950 font-extrabold text-sm shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {editingTripId
                ? '과거 여행 기록 수정 완료'
                : '세계지도에 추억 여행 등록하기'}
            </span>
          </button>
        </form>
      </BottomSheet>

      {/* 추억 사진 추가 바텀 시트 */}
      <BottomSheet
        isOpen={isPhotoSheetOpen}
        onClose={() => setIsPhotoSheetOpen(false)}
        title="추억 사진 기록하기"
      >
        <form onSubmit={handleAddPhoto} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              기기에서 사진 선택 (자동 리사이즈 및 오프라인 저장)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-500/20 file:text-sky-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              또는 이미지 URL 직접 입력
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={photoForm.url}
              onChange={(e) => setPhotoForm({ ...photoForm, url: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          {photoForm.url && (
            <img
              src={photoForm.url}
              alt="미리보기"
              className="w-full h-40 object-cover rounded-2xl border border-white/10"
            />
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">한 줄 캡션</label>
            <input
              type="text"
              placeholder="예: 시부야 스카이에서 본 황혼"
              value={photoForm.caption}
              onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          <button
            type="submit"
            disabled={!photoForm.url}
            className="tap-target w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-zinc-950 font-bold text-sm"
          >
            앨범에 저장하기
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
