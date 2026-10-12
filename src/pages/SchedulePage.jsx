import { useEffect, useState } from 'react';
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
  Clock,
  GripVertical,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import RouteMapView from '../components/RouteMapView';
import { searchPlaceCandidates } from '../services/maps.js';
import { getTripDurationDays, useTripStore } from '../store/useTripStore.js';

const CATEGORY_META = {
  spot: { label: '명소', color: 'bg-sky-500/20 text-sky-300 border-sky-400/30' },
  food: { label: '맛집', color: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
  cafe: { label: '카페', color: 'bg-pink-500/20 text-pink-300 border-pink-400/30' },
  stay: { label: '숙소', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' },
  transit: { label: '이동', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
};

function SortableScheduleItem({ item, index, isHighlighted, onSelect, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cat = CATEGORY_META[item.category] || CATEGORY_META.spot;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(item.id)}
      className={`glass-card rounded-2xl p-3.5 flex items-center justify-between gap-2.5 border transition-all ${
        isDragging
          ? 'z-30 opacity-90 scale-[1.02] ring-2 ring-sky-400 shadow-2xl'
          : isHighlighted
          ? 'border-amber-400/70 bg-amber-500/10'
          : 'border-white/10'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* 드래그 핸들 (>= 44pt Touch Target) */}
        <button
          type="button"
          aria-label="순서 이동 핸들"
          {...attributes}
          {...listeners}
          className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-white bg-white/5 cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* 동선 핀 번호 */}
        <span className="w-6 h-6 rounded-full bg-sky-500 text-zinc-950 text-xs font-extrabold flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300">
              <Clock className="w-3 h-3" />
              {item.time_slot}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.color}`}>
              {cat.label}
            </span>
          </div>

          <h3 className="text-sm font-bold text-white truncate mt-0.5">{item.place_name}</h3>
          {(item.memo || item.address) && (
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {item.memo ? `${item.memo} · ${item.address}` : item.address}
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
        aria-label={`${item.place_name} 일정 삭제`}
        className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function SchedulePage() {
  const trips = useTripStore((s) => s.trips);
  const schedules = useTripStore((s) => s.schedules);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const selectedDay = useTripStore((s) => s.selectedDay);
  const setSelectedDay = useTripStore((s) => s.setSelectedDay);
  const saveSchedule = useTripStore((s) => s.saveSchedule);
  const reorderSchedules = useTripStore((s) => s.reorderSchedules);
  const deleteSchedule = useTripStore((s) => s.deleteSchedule);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];
  const durationDays = activeTrip
    ? getTripDurationDays(activeTrip.start_date, activeTrip.end_date)
    : 1;

  const dayList = Array.from({ length: durationDays }, (_, i) => i + 1);

  const daySchedules = schedules
    .filter((s) => s.trip_id === activeTrip?.id && s.day_number === selectedDay)
    .sort((a, b) => a.order_index - b.order_index);

  const [highlightedId, setHighlightedId] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState({
    place_name: '',
    category: 'spot',
    time_slot: '12:00',
    lat: 35.6762,
    lng: 139.6503,
    address: '',
    memo: '',
  });

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

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeTrip) return;

    const oldIndex = daySchedules.findIndex((i) => i.id === active.id);
    const newIndex = daySchedules.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(daySchedules, oldIndex, newIndex);
    await reorderSchedules(activeTrip.id, selectedDay, reordered);
  };

  const handlePickCandidate = (place) => {
    setForm((prev) => ({
      ...prev,
      place_name: place.place_name,
      category: place.category || prev.category,
      lat: place.lat,
      lng: place.lng,
      address: place.address || '',
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.place_name.trim() || !activeTrip) return;

    // 동일한 기본 좌표일 경우 지도 위 핀이 겹치지 않도록 미세 오프셋 부여
    const baseLat = Number(form.lat) || ( daySchedules[0]?.lat ?? 35.6762 );
    const baseLng = Number(form.lng) || ( daySchedules[0]?.lng ?? 139.6503 );
    const jitter = daySchedules.length * 0.004;

    await saveSchedule({
      ...form,
      trip_id: activeTrip.id,
      day_number: selectedDay,
      order_index: daySchedules.length,
      lat: form.lat !== 35.6762 ? form.lat : baseLat + jitter,
      lng: form.lng !== 139.6503 ? form.lng : baseLng + jitter,
    });

    setForm({
      place_name: '',
      category: 'spot',
      time_slot: '14:00',
      lat: 35.6762,
      lng: 139.6503,
      address: '',
      memo: '',
    });
    setSearchQuery('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* 1. 일차(Day) 선택 가로 스크롤 바 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {dayList.map((day) => {
            const isSelected = day === selectedDay;
            const count = schedules.filter(
              (s) => s.trip_id === activeTrip?.id && s.day_number === day
            ).length;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`tap-target px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 border transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-zinc-950 border-sky-400 shadow-lg shadow-sky-500/20'
                    : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Day {day}
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    isSelected ? 'bg-black/20 text-zinc-950' : 'bg-white/10 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="tap-target inline-flex items-center gap-1 px-3.5 py-2 rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs shrink-0 shadow-lg shadow-sky-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>장소 추가</span>
        </button>
      </div>

      {/* 2. 지도 핀 & 이동 동선(Polyline) 뷰 */}
      <RouteMapView
        items={daySchedules}
        activeId={highlightedId}
        onSelectPin={(id) => setHighlightedId(id)}
      />

      {/* 3. 드래그 앤 드롭 타임라인 리스트 */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-zinc-400">
            Day {selectedDay} 타임라인 (좌측 핸들을 끌어 동선 순서 변경)
          </h2>
          <span className="text-xs text-zinc-500">{daySchedules.length}개 일정</span>
        </div>

        {daySchedules.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center space-y-2">
            <MapPin className="w-7 h-7 text-sky-400 mx-auto" />
            <p className="text-sm font-medium text-zinc-200">
              Day {selectedDay}에 등록된 장소가 없습니다
            </p>
            <p className="text-xs text-zinc-400">
              우측 상단 [장소 추가]를 눌러 첫 목적지를 등록해 보세요.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={daySchedules.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {daySchedules.map((item, idx) => (
                  <SortableScheduleItem
                    key={item.id}
                    item={item}
                    index={idx}
                    isHighlighted={item.id === highlightedId}
                    onSelect={setHighlightedId}
                    onDelete={deleteSchedule}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* 4. 장소 검색 & 일정 추가 바텀 시트 */}
      <BottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={`Day ${selectedDay} 장소 검색 및 추가`}
      >
        <div className="space-y-4">
          {/* 스마트 장소 검색창 */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              장소 검색 (내장 인기 명소 & 지도 좌표 자동 매칭)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="시부야, 츠키지, 협재, 도톤보리 등 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            {candidates.length > 0 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {candidates.map((c, idx) => (
                  <button
                    key={`${c.place_name}-${idx}`}
                    type="button"
                    onClick={() => handlePickCandidate(c)}
                    className="tap-target shrink-0 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/25 text-left"
                  >
                    <p className="text-xs font-semibold text-sky-300">{c.place_name}</p>
                    <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">{c.address}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-3 pt-2 border-t border-white/10">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">장소 이름</label>
              <input
                type="text"
                required
                placeholder="방문할 장소명 입력"
                value={form.place_name}
                onChange={(e) => setForm({ ...form, place_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">방문 시간</label>
                <input
                  type="time"
                  required
                  value={form.time_slot}
                  onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">카테고리</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                >
                  {Object.entries(CATEGORY_META).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                메모 / 예약 정보
              </label>
              <input
                type="text"
                placeholder="예: 창가석 예약 완료, 입장권 바코드 준비"
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <button
              type="submit"
              className="tap-target w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm"
            >
              Day {selectedDay} 동선에 추가하기
            </button>
          </form>
        </div>
      </BottomSheet>
    </div>
  );
}
