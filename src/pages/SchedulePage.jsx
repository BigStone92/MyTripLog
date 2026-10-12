import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  BedDouble,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudSun,
  FileText,
  GripVertical,
  Map,
  MapPin,
  Plane,
  Plus,
  Search,
  Square,
  Trash2,
  Wallet,
} from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import RouteMapView from '../components/RouteMapView';
import SyncBadge from '../components/SyncBadge';
import { searchPlaceCandidates } from '../services/maps.js';
import {
  formatCommaNumber,
  formatDotDateRange,
  getDayDateLabel,
  getTripDurationDays,
  isTripPast,
  makeId,
  stripCommaNumber,
  useTripStore,
} from '../store/useTripStore.js';

const CATEGORY_META = {
  spot: { label: '명소', color: 'bg-sky-500/20 text-sky-300 border-sky-400/30' },
  food: { label: '맛집', color: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
  cafe: { label: '카페', color: 'bg-pink-500/20 text-pink-300 border-pink-400/30' },
  stay: { label: '숙소', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' },
  transit: { label: '이동', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
  memo: { label: '메모', color: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
};

const CHECKLIST_PRESETS = [
  '여권 & 신분증',
  '항공권 E-티켓 캡처',
  '유심 / eSIM / 로밍',
  '트래블로그 / 현지 환전',
  '멀티 어댑터(돼지코) & 보조배터리',
  '상비약 (소화제·진통제)',
];

function SortableScheduleItem({ item, index, isHighlighted, onSelect, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cat = CATEGORY_META[item.category] || CATEGORY_META.spot;
  const isMemo = item.category === 'memo';

  return (
    <div ref={setNodeRef} style={style} className="relative pl-6">
      {/* 좌측 타임라인 포인트 점 */}
      <span
        className={`absolute left-0 top-4 w-2.5 h-2.5 rounded-full ring-4 ring-[#0a0a0c] ${
          isMemo ? 'bg-purple-400' : 'bg-sky-400'
        }`}
      />

      <div
        onClick={() => onSelect(item.id, item.day_number)}
        className={`glass-card rounded-2xl p-3.5 flex items-center justify-between gap-2.5 border transition-all ${
          isDragging
            ? 'z-30 opacity-90 scale-[1.02] ring-2 ring-sky-400 shadow-2xl'
            : isHighlighted
            ? 'border-amber-400/70 bg-amber-500/10'
            : 'border-white/10'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            aria-label="순서 이동 핸들"
            {...attributes}
            {...listeners}
            className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-white bg-white/5 cursor-grab active:cursor-grabbing touch-none shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {!isMemo ? (
            <span className="w-6 h-6 rounded-full bg-sky-500 text-zinc-950 text-xs font-extrabold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
          ) : (
            <span className="w-6 h-6 rounded-full bg-purple-500/25 border border-purple-400/40 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {!isMemo && item.time_slot && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300">
                  <Clock className="w-3 h-3" />
                  {item.time_slot}
                </span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.color}`}>
                {cat.label}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white truncate mt-0.5">{item.place_name}</h3>
            {(item.memo || item.address) && (
              <p className="text-xs text-zinc-400 whitespace-pre-line line-clamp-2 mt-0.5">
                {item.memo && item.address
                  ? `${item.memo} · ${item.address}`
                  : item.memo || item.address}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          aria-label={`${item.place_name} 삭제`}
          className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const trips = useTripStore((s) => s.trips);
  const schedules = useTripStore((s) => s.schedules);
  const expenses = useTripStore((s) => s.expenses);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const selectedDay = useTripStore((s) => s.selectedDay);
  const setSelectedDay = useTripStore((s) => s.setSelectedDay);
  const saveTrip = useTripStore((s) => s.saveTrip);
  const saveSchedule = useTripStore((s) => s.saveSchedule);
  const reorderSchedules = useTripStore((s) => s.reorderSchedules);
  const deleteSchedule = useTripStore((s) => s.deleteSchedule);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];
  const durationDays = activeTrip
    ? getTripDurationDays(activeTrip.start_date, activeTrip.end_date)
    : 1;
  const dayList = Array.from({ length: durationDays }, (_, i) => i + 1);

  const flights = activeTrip?.flights || [];
  const accommodations = activeTrip?.accommodations || [];
  const checklist = activeTrip?.checklist || [];
  const checkedCount = checklist.filter((c) => c.done).length;

  const tripExpenses = expenses.filter((e) => e.trip_id === activeTrip?.id);
  const totalSpentKrw = tripExpenses.reduce((sum, e) => sum + (e.krw_amount || 0), 0);

  // 지도 토글 & 항공·숙소 요약 카드 접기/펼치기 상태
  const [showMap, setShowMap] = useState(false);
  const [showBookingsCard, setShowBookingsCard] = useState(true);
  const [highlightedId, setHighlightedId] = useState(null);

  // 모달 상태: null | 'flight' | 'stay' | 'checklist' | 'place' | 'memo'
  const [activeModal, setActiveModal] = useState(null);
  const [targetDay, setTargetDay] = useState(1);

  // 장소 검색 및 폼 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [placeForm, setPlaceForm] = useState({
    place_name: '',
    category: 'spot',
    time_slot: '10:00',
    lat: 35.6762,
    lng: 139.6503,
    address: '',
    memo: '',
  });

  // 메모 추가 폼 상태
  const [memoForm, setMemoForm] = useState({
    title: '',
    content: '',
  });

  // 항공편 폼 상태
  const [flightForm, setFlightForm] = useState({
    route: '',
    airline: '',
    outbound_time: '',
    inbound_time: '',
    price: '',
    tag: '#예약완료',
  });

  // 숙소 폼 상태
  const [stayForm, setStayForm] = useState({
    name: '',
    period: '',
    address: '',
    price: '',
  });

  // 체크리스트 입력 상태
  const [checklistInput, setChecklistInput] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } })
  );

  useEffect(() => {
    let active = true;
    searchPlaceCandidates(searchQuery).then((res) => {
      if (active) setCandidates(res);
    });
    return () => {
      active = false;
    };
  }, [searchQuery]);

  if (!activeTrip) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center space-y-3 mt-4">
        <p className="text-2xl">✈️</p>
        <p className="text-sm font-semibold text-white">선택된 여행 일정이 없습니다</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="tap-target px-4 py-2 rounded-2xl bg-sky-500 text-zinc-950 text-xs font-bold"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const handleBack = () => {
    navigate(isTripPast(activeTrip) ? '/archive' : '/');
  };

  const openPlaceModal = (day) => {
    setTargetDay(day);
    setSelectedDay(day);
    setPlaceForm({
      place_name: '',
      category: 'spot',
      time_slot: '11:00',
      lat: 35.6762,
      lng: 139.6503,
      address: '',
      memo: '',
    });
    setSearchQuery('');
    setActiveModal('place');
  };

  const openMemoModal = (day) => {
    setTargetDay(day);
    setSelectedDay(day);
    setMemoForm({ title: '', content: '' });
    setActiveModal('memo');
  };

  const handlePickCandidate = (place) => {
    setPlaceForm((prev) => ({
      ...prev,
      place_name: place.place_name,
      category: place.category || prev.category,
      lat: place.lat,
      lng: place.lng,
      address: place.address || '',
    }));
  };

  const handleAddPlaceSubmit = async (e) => {
    e.preventDefault();
    if (!placeForm.place_name.trim()) return;

    const dayItems = schedules.filter(
      (s) => s.trip_id === activeTrip.id && s.day_number === targetDay
    );
    const baseLat = Number(placeForm.lat) || (dayItems[0]?.lat ?? 35.6762);
    const baseLng = Number(placeForm.lng) || (dayItems[0]?.lng ?? 139.6503);
    const jitter = dayItems.length * 0.004;

    await saveSchedule({
      ...placeForm,
      trip_id: activeTrip.id,
      day_number: targetDay,
      order_index: dayItems.length,
      lat: placeForm.lat !== 35.6762 ? placeForm.lat : baseLat + jitter,
      lng: placeForm.lng !== 139.6503 ? placeForm.lng : baseLng + jitter,
    });
    setActiveModal(null);
  };

  const handleAddMemoSubmit = async (e) => {
    e.preventDefault();
    if (!memoForm.title.trim() && !memoForm.content.trim()) return;

    const dayItems = schedules.filter(
      (s) => s.trip_id === activeTrip.id && s.day_number === targetDay
    );

    await saveSchedule({
      trip_id: activeTrip.id,
      day_number: targetDay,
      order_index: dayItems.length,
      place_name: memoForm.title.trim() || '일정 메모',
      category: 'memo',
      time_slot: '',
      lat: dayItems[0]?.lat ?? 35.6762,
      lng: dayItems[0]?.lng ?? 139.6503,
      address: '',
      memo: memoForm.content.trim(),
    });
    setActiveModal(null);
  };

  const handleDayDragEnd = async (day, daySchedules, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = daySchedules.findIndex((i) => i.id === active.id);
    const newIndex = daySchedules.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(daySchedules, oldIndex, newIndex);
    await reorderSchedules(activeTrip.id, day, reordered);
  };

  // --- 항공편 추가 / 삭제 ---
  const handleAddFlight = async (e) => {
    e.preventDefault();
    if (!flightForm.route.trim()) return;
    const newFlight = {
      id: makeId('flt'),
      route: flightForm.route.trim(),
      airline: flightForm.airline.trim() || '항공편',
      outbound_time: flightForm.outbound_time.trim(),
      inbound_time: flightForm.inbound_time.trim(),
      price: Number(stripCommaNumber(flightForm.price)) || 0,
      tag: flightForm.tag.trim() || '#항공권',
    };
    await saveTrip({
      ...activeTrip,
      flights: [...flights, newFlight],
    });
    setFlightForm({
      route: '',
      airline: '',
      outbound_time: '',
      inbound_time: '',
      price: '',
      tag: '#예약완료',
    });
  };

  const handleDeleteFlight = async (flightId) => {
    await saveTrip({
      ...activeTrip,
      flights: flights.filter((f) => f.id !== flightId),
    });
  };

  // --- 숙소 추가 / 삭제 ---
  const handleAddStay = async (e) => {
    e.preventDefault();
    if (!stayForm.name.trim()) return;
    const newStay = {
      id: makeId('stay'),
      name: stayForm.name.trim(),
      period: stayForm.period.trim(),
      address: stayForm.address.trim(),
      price: Number(stripCommaNumber(stayForm.price)) || 0,
    };
    await saveTrip({
      ...activeTrip,
      accommodations: [...accommodations, newStay],
    });
    setStayForm({ name: '', period: '', address: '', price: '' });
  };

  const handleDeleteStay = async (stayId) => {
    await saveTrip({
      ...activeTrip,
      accommodations: accommodations.filter((s) => s.id !== stayId),
    });
  };

  // --- 체크리스트 추가 / 토글 / 삭제 ---
  const handleAddChecklistItem = async (text) => {
    const clean = text.trim();
    if (!clean) return;
    const newItem = {
      id: makeId('chk'),
      text: clean,
      done: false,
    };
    await saveTrip({
      ...activeTrip,
      checklist: [...checklist, newItem],
    });
    setChecklistInput('');
  };

  const handleToggleChecklist = async (itemId) => {
    const nextList = checklist.map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c
    );
    await saveTrip({ ...activeTrip, checklist: nextList });
  };

  const handleDeleteChecklist = async (itemId) => {
    await saveTrip({
      ...activeTrip,
      checklist: checklist.filter((c) => c.id !== itemId),
    });
  };

  const mapDaySchedules = schedules
    .filter(
      (s) =>
        s.trip_id === activeTrip.id &&
        s.day_number === selectedDay &&
        s.category !== 'memo'
    )
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-4">
      {/* 1. 상단 고정 헤더 + 4대 등록 캡슐 버튼 (첨부 이미지 레이아웃 100% 반영) */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-safe-header pb-3 glass-panel border-x-0 border-t-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              aria-label="뒤로 가기"
              className="tap-target inline-flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-200 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-white truncate">
                {activeTrip.cover_emoji} {activeTrip.title}
              </h1>
              <p className="text-xs text-zinc-400 font-medium">
                {formatDotDateRange(activeTrip.start_date, activeTrip.end_date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              aria-label="지도 동선 토글"
              className={`tap-target px-3 py-1.5 rounded-2xl border text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                showMap
                  ? 'bg-sky-500 text-zinc-950 border-sky-400'
                  : 'bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>지도</span>
            </button>
            <SyncBadge />
          </div>
        </div>

        {/* 상단 4개 퀵 액션 필 버튼: + 항공편 | + 숙소 | 체크리스트 | 가계부 (Apple HIG >= 44pt) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setActiveModal('flight')}
            className={`tap-target px-3.5 py-2 rounded-full text-xs font-bold shrink-0 border transition flex items-center gap-1.5 ${
              flights.length > 0
                ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                : 'bg-white/8 border-white/10 text-zinc-200 hover:bg-white/15'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>항공편</span>
            {flights.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-sky-400/20 text-sky-300 text-[10px]">
                {flights.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('stay')}
            className={`tap-target px-3.5 py-2 rounded-full text-xs font-bold shrink-0 border transition flex items-center gap-1.5 ${
              accommodations.length > 0
                ? 'bg-indigo-500/15 border-indigo-400/40 text-indigo-300'
                : 'bg-white/8 border-white/10 text-zinc-200 hover:bg-white/15'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>숙소</span>
            {accommodations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-400/20 text-indigo-300 text-[10px]">
                {accommodations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('checklist')}
            className={`tap-target px-3.5 py-2 rounded-full text-xs font-bold shrink-0 border transition flex items-center gap-1.5 ${
              checklist.length > 0
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                : 'bg-white/8 border-white/10 text-zinc-200 hover:bg-white/15'
            }`}
          >
            <span>체크리스트</span>
            {checklist.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px]">
                {checkedCount}/{checklist.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/budget')}
            className="tap-target px-3.5 py-2 rounded-full text-xs font-bold shrink-0 border bg-white/8 border-white/10 text-zinc-200 hover:bg-white/15 transition flex items-center gap-1.5"
          >
            <span>가계부</span>
            {totalSpentKrw > 0 && (
              <span className="text-[10px] text-amber-300 font-semibold">
                ₩{totalSpentKrw.toLocaleString()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. 지도 동선 뷰 (우측 상단 [지도] 버튼 클릭 시 펼침) */}
      {showMap && (
        <section className="space-y-2 animate-fadeIn">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {dayList.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`tap-target px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition ${
                  day === selectedDay
                    ? 'bg-sky-500 text-zinc-950 border-sky-400'
                    : 'bg-white/5 text-zinc-300 border-white/10'
                }`}
              >
                day {day} 동선
              </button>
            ))}
          </div>
          <RouteMapView
            schedules={mapDaySchedules}
            highlightedId={highlightedId}
            onSelectPin={(id) => setHighlightedId(id)}
          />
        </section>
      )}

      {/* 3. 등록된 항공편 & 숙소 요약 카드 섹션 (첨부 이미지의 '서울 - 다낭' 카드 스타일) */}
      {(flights.length > 0 || accommodations.length > 0) && (
        <section className="glass-card rounded-3xl p-4 space-y-3 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[11px] font-bold">
                예약 내역
              </span>
              <span className="text-xs font-bold text-white">
                등록된 항공권 · 숙소 ({flights.length + accommodations.length}건)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowBookingsCard((v) => !v)}
              aria-label="예약 내역 접기/펼치기"
              className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-white"
            >
              {showBookingsCard ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {showBookingsCard && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {flights.map((flt) => (
                <div
                  key={flt.id}
                  onClick={() => setActiveModal('flight')}
                  className="min-w-[240px] max-w-[270px] shrink-0 rounded-2xl p-4 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 cursor-pointer space-y-2 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-white truncate">{flt.route}</h4>
                    <span className="text-[11px] font-bold text-rose-400 shrink-0">
                      {flt.airline}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-0.5 leading-relaxed">
                    {flt.outbound_time && <p>{flt.outbound_time}</p>}
                    {flt.inbound_time && <p>{flt.inbound_time}</p>}
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-400">
                      {flt.tag || '#항공편'}
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      {flt.price > 0 ? `${flt.price.toLocaleString()}원` : '일정 확인'}
                    </span>
                  </div>
                </div>
              ))}

              {accommodations.map((stay) => (
                <div
                  key={stay.id}
                  onClick={() => setActiveModal('stay')}
                  className="min-w-[240px] max-w-[270px] shrink-0 rounded-2xl p-4 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 cursor-pointer space-y-2 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-white truncate">{stay.name}</h4>
                    <span className="text-[11px] font-bold text-indigo-300 shrink-0">숙소</span>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-0.5 leading-relaxed">
                    {stay.period && <p>{stay.period}</p>}
                    {stay.address && <p className="truncate">{stay.address}</p>}
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400">#숙소예약</span>
                    <span className="text-sm font-extrabold text-white">
                      {stay.price > 0 ? `${stay.price.toLocaleString()}원` : '상세 보기'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. 일차별(day 1, day 2, day 3...) 세로 타임라인 & 각 일차 하단 [장소 추가] / [메모 추가] 버튼 */}
      <div className="space-y-7 pt-1">
        {dayList.map((day) => {
          const daySchedules = schedules
            .filter((s) => s.trip_id === activeTrip.id && s.day_number === day)
            .sort((a, b) => a.order_index - b.order_index);

          return (
            <section key={day} className="space-y-3">
              {/* 일차 헤더: day 1 3.25/목 ⛅ */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-white tracking-tight">
                    day {day}
                  </h2>
                  <span className="text-sm font-semibold text-zinc-400">
                    {getDayDateLabel(activeTrip.start_date, day)}
                  </span>
                  <CloudSun className="w-4 h-4 text-amber-300/80" />
                </div>
                {daySchedules.length > 0 && (
                  <span className="text-[11px] text-zinc-500">
                    {daySchedules.length}개 일정
                  </span>
                )}
              </div>

              {/* 해당 일차 타임라인 리스트 (좌측 세로 연결선 포함) */}
              {daySchedules.length > 0 && (
                <div className="relative before:content-[''] before:absolute before:left-[4px] before:top-4 before:bottom-4 before:w-[1.5px] before:bg-white/15">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDayDragEnd(day, daySchedules, event)}
                  >
                    <SortableContext
                      items={daySchedules.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2.5">
                        {daySchedules.map((item, idx) => (
                          <SortableScheduleItem
                            key={item.id}
                            item={item}
                            index={idx}
                            isHighlighted={item.id === highlightedId}
                            onSelect={(id, d) => {
                              setHighlightedId(id);
                              setSelectedDay(d);
                            }}
                            onDelete={deleteSchedule}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* 하단 [장소 추가] | [메모 추가] 2열 버튼 (첨부 이미지 디자인 100% 반영) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => openPlaceModal(day)}
                  className="tap-target py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:scale-[0.98] border border-white/15 text-xs font-bold text-zinc-100 transition text-center"
                >
                  장소 추가
                </button>
                <button
                  type="button"
                  onClick={() => openMemoModal(day)}
                  className="tap-target py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:scale-[0.98] border border-white/15 text-xs font-bold text-zinc-100 transition text-center"
                >
                  메모 추가
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {/* ================= 바텀 시트 모달 영역 ================= */}

      {/* A. 장소 추가 바텀 시트 */}
      <BottomSheet
        isOpen={activeModal === 'place'}
        onClose={() => setActiveModal(null)}
        title={`day ${targetDay} (${getDayDateLabel(activeTrip.start_date, targetDay)}) 장소 추가`}
      >
        <div className="space-y-4">
          {/* 일차 변경 가능 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {dayList.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setTargetDay(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
                  d === targetDay
                    ? 'bg-sky-500 text-zinc-950 border-sky-400'
                    : 'bg-white/5 text-zinc-400 border-white/10'
                }`}
              >
                day {d}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="장소·명소 검색 (예: 한시장, 바나힐, 시부야, 공항)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {candidates.map((c, idx) => (
                <button
                  key={`${c.place_name}-${idx}`}
                  type="button"
                  onClick={() => handlePickCandidate(c)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 text-xs text-sky-200 flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-sky-400" />
                  <span>{c.place_name}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddPlaceSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">장소명</label>
              <input
                type="text"
                required
                placeholder="방문할 장소 이름"
                value={placeForm.place_name}
                onChange={(e) => setPlaceForm({ ...placeForm, place_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">방문 시간</label>
                <input
                  type="time"
                  value={placeForm.time_slot}
                  onChange={(e) => setPlaceForm({ ...placeForm, time_slot: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">카테고리</label>
                <select
                  value={placeForm.category}
                  onChange={(e) => setPlaceForm({ ...placeForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="spot">📍 명소/관광</option>
                  <option value="food">🍜 맛집/식사</option>
                  <option value="cafe">☕ 카페/디저트</option>
                  <option value="stay">🏨 숙소/호텔</option>
                  <option value="transit">🚆 공항/이동</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                간단 메모 / 예약 정보
              </label>
              <input
                type="text"
                placeholder="예: 입장권 QR 준비, 그랩 이동 15분"
                value={placeForm.memo}
                onChange={(e) => setPlaceForm({ ...placeForm, memo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <button
              type="submit"
              className="tap-target w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm shadow-lg shadow-sky-500/25"
            >
              day {targetDay}에 장소 등록하기
            </button>
          </form>
        </div>
      </BottomSheet>

      {/* B. 메모 추가 바텀 시트 */}
      <BottomSheet
        isOpen={activeModal === 'memo'}
        onClose={() => setActiveModal(null)}
        title={`day ${targetDay} (${getDayDateLabel(activeTrip.start_date, targetDay)}) 메모 추가`}
      >
        <form onSubmit={handleAddMemoSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">메모 제목</label>
            <input
              type="text"
              placeholder="예: 공항 픽업 안내 / 유심 수령처"
              value={memoForm.title}
              onChange={(e) => setMemoForm({ ...memoForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">상세 메모 내용</label>
            <textarea
              rows={4}
              required
              placeholder="이동 방법, 예약 번호, 쇼핑 리스트 등 자유롭게 적어주세요."
              value={memoForm.content}
              onChange={(e) => setMemoForm({ ...memoForm, content: e.target.value })}
              className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-400"
            />
          </div>
          <button
            type="submit"
            className="tap-target w-full py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold text-sm"
          >
            day {targetDay}에 메모 등록하기
          </button>
        </form>
      </BottomSheet>

      {/* C. + 항공편 등록 및 관리 바텀 시트 */}
      <BottomSheet
        isOpen={activeModal === 'flight'}
        onClose={() => setActiveModal(null)}
        title="✈️ 항공편 등록 및 관리"
      >
        <div className="space-y-4">
          {flights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400">등록된 항공편 ({flights.length})</p>
              {flights.map((flt) => (
                <div
                  key={flt.id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{flt.route}</span>
                      <span className="text-xs text-rose-400 font-semibold">{flt.airline}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {[flt.outbound_time, flt.inbound_time].filter(Boolean).join(' / ')}
                    </p>
                    {flt.price > 0 && (
                      <p className="text-xs font-bold text-sky-400 mt-0.5">
                        {flt.price.toLocaleString()}원
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteFlight(flt.id)}
                    className="tap-target p-2 text-zinc-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddFlight} className="space-y-3 pt-2 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">구간 (출발 - 도착)</label>
                <input
                  type="text"
                  required
                  placeholder="예: 서울 - 다낭"
                  value={flightForm.route}
                  onChange={(e) => setFlightForm({ ...flightForm, route: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">항공사 / 편명</label>
                <input
                  type="text"
                  placeholder="예: 비엣젯항공"
                  value={flightForm.airline}
                  onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">가는편 일시·시간</label>
              <input
                type="text"
                placeholder="예: 3.25(목), 07:00 - 10:05"
                value={flightForm.outbound_time}
                onChange={(e) => setFlightForm({ ...flightForm, outbound_time: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">오는편 일시·시간 (선택)</label>
              <input
                type="text"
                placeholder="예: 3.28(일), 23:45 - 06:00"
                value={flightForm.inbound_time}
                onChange={(e) => setFlightForm({ ...flightForm, inbound_time: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">항공권 금액 (원화, 선택)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="예: 421,000"
                value={formatCommaNumber(flightForm.price)}
                onChange={(e) =>
                  setFlightForm({ ...flightForm, price: stripCommaNumber(e.target.value) })
                }
                className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="tap-target w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm"
            >
              항공편 추가하기
            </button>
          </form>
        </div>
      </BottomSheet>

      {/* D. + 숙소 등록 및 관리 바텀 시트 */}
      <BottomSheet
        isOpen={activeModal === 'stay'}
        onClose={() => setActiveModal(null)}
        title="🏨 숙소 등록 및 관리"
      >
        <div className="space-y-4">
          {accommodations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400">
                등록된 숙소 ({accommodations.length})
              </p>
              {accommodations.map((stay) => (
                <div
                  key={stay.id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{stay.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {[stay.period, stay.address].filter(Boolean).join(' · ')}
                    </p>
                    {stay.price > 0 && (
                      <p className="text-xs font-bold text-indigo-300 mt-0.5">
                        {stay.price.toLocaleString()}원
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteStay(stay.id)}
                    className="tap-target p-2 text-zinc-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddStay} className="space-y-3 pt-2 border-t border-white/10">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">숙소명 (호텔/리조트/에어비앤비)</label>
              <input
                type="text"
                required
                placeholder="예: 멜리아 빈펄 다낭 리버프론트"
                value={stayForm.name}
                onChange={(e) => setStayForm({ ...stayForm, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">체크인 ~ 체크아웃 일정</label>
              <input
                type="text"
                placeholder="예: 3.25(목) 15:00 ~ 3.28(일) 12:00 (3박)"
                value={stayForm.period}
                onChange={(e) => setStayForm({ ...stayForm, period: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">숙박 금액 (원화, 선택)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="예: 360,000"
                  value={formatCommaNumber(stayForm.price)}
                  onChange={(e) =>
                    setStayForm({ ...stayForm, price: stripCommaNumber(e.target.value) })
                  }
                  className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">위치 / 예약 메모</label>
                <input
                  type="text"
                  placeholder="예: 조식 포함, 레이트 체크아웃"
                  value={stayForm.address}
                  onChange={(e) => setStayForm({ ...stayForm, address: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="tap-target w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm"
            >
              숙소 추가하기
            </button>
          </form>
        </div>
      </BottomSheet>

      {/* E. 체크리스트 바텀 시트 */}
      <BottomSheet
        isOpen={activeModal === 'checklist'}
        onClose={() => setActiveModal(null)}
        title={`☑️ 여행 준비물 체크리스트 (${checkedCount}/${checklist.length})`}
      >
        <div className="space-y-4">
          {/* 원터치 추천 준비물 칩 */}
          <div className="space-y-1.5">
            <p className="text-[11px] text-zinc-400">자주 쓰는 준비물 원터치 추가</p>
            <div className="flex flex-wrap gap-1.5">
              {CHECKLIST_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddChecklistItem(preset)}
                  className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddChecklistItem(checklistInput);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="직접 준비물 입력 (예: 선글라스, 수영복)"
              value={checklistInput}
              onChange={(e) => setChecklistInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="tap-target px-4 py-2.5 rounded-2xl bg-emerald-500 text-zinc-950 font-bold text-xs shrink-0"
            >
              추가
            </button>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {checklist.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">
                등록된 준비물이 없습니다. 위 버튼을 눌러 추가해 보세요.
              </p>
            ) : (
              checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item.id)}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.done ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                    <span
                      className={`text-sm truncate ${
                        item.done ? 'line-through text-zinc-500' : 'text-white'
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChecklist(item.id);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
