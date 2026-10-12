import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Plus,
  Wallet,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit3,
  ChevronRight,
  Search,
} from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import DateRangePicker from '../components/DateRangePicker';
import { searchFlagsAndIcons } from '../services/countries.js';
import {
  calculateDday,
  formatCommaNumber,
  getLocalTodayStr,
  getMergedCurrencies,
  getTripDurationDays,
  isTripPast,
  stripCommaNumber,
  useTripStore,
} from '../store/useTripStore.js';

const TRIP_DRAFT_STORAGE_KEY = 'mytriplog_trip_form_draft_v1';

function createInitialForm() {
  const today = getLocalTodayStr();
  return {
    title: '',
    destination: '',
    start_date: today,
    end_date: today,
    total_budget: 1000000,
    currency: 'KRW',
    cover_emoji: '✈️',
    memo: '',
  };
}

function loadSavedTripDraft() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TRIP_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const trips = useTripStore((s) => s.trips);
  const schedules = useTripStore((s) => s.schedules);
  const expenses = useTripStore((s) => s.expenses);
  const customCurrencies = useTripStore((s) => s.customCurrencies);
  const registerCustomCurrency = useTripStore((s) => s.registerCustomCurrency);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const setActiveTripId = useTripStore((s) => s.setActiveTripId);
  const saveTrip = useTripStore((s) => s.saveTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);

  // 홈: 아직 여행 기간이 지나지 않은 예정/진행 중 여행 일정만 필터링
  const upcomingTrips = useMemo(
    () =>
      trips
        .filter((t) => !isTripPast(t))
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [trips]
  );

  const activeTrip =
    upcomingTrips.find((t) => t.id === activeTripId) || upcomingTrips[0] || null;

  const allCurrencies = useMemo(
    () => Object.values(getMergedCurrencies(customCurrencies)),
    [customCurrencies]
  );

  // 앱 전환(카카오톡/사파리 백그라운드 등) 후 돌아와도 작성 중인 모달과 입력값 자동 복원
  const savedDraft = useMemo(() => loadSavedTripDraft(), []);
  const [isSheetOpen, setIsSheetOpen] = useState(() => Boolean(savedDraft?.isOpen));
  const [editingId, setEditingId] = useState(() => savedDraft?.editingId || null);
  const [form, setForm] = useState(() => savedDraft?.form || createInitialForm());

  // 한 화면 출발일~종료일 통합 달력 표시 상태
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 대표 아이콘(전 세계 국기) 검색 상태
  const [flagQuery, setFlagQuery] = useState('');
  const filteredFlags = useMemo(() => searchFlagsAndIcons(flagQuery), [flagQuery]);

  // 미등록 현지 통화 직접 등록 상태
  const [showCustomCurrencyBox, setShowCustomCurrencyBox] = useState(false);
  const [customCurrencyForm, setCustomCurrencyForm] = useState({
    code: '',
    name: '',
    rate: '',
  });

  // 작성 중인 내용 실시간 localStorage 자동 백업
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    if (isSheetOpen) {
      localStorage.setItem(
        TRIP_DRAFT_STORAGE_KEY,
        JSON.stringify({ isOpen: true, editingId, form })
      );
    } else {
      localStorage.removeItem(TRIP_DRAFT_STORAGE_KEY);
    }
  }, [isSheetOpen, editingId, form]);

  const closeAndClearDraft = () => {
    setIsSheetOpen(false);
    setShowDatePicker(false);
    setShowCustomCurrencyBox(false);
    setFlagQuery('');
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TRIP_DRAFT_STORAGE_KEY);
    }
  };

  const openNewTripModal = () => {
    // 만약 이전에 작성하다가 앱 전환 등으로 남아 있던 신규 드래프트가 있으면 이어서 작성
    const draft = loadSavedTripDraft();
    if (draft?.form && !draft.editingId && (draft.form.title || draft.form.destination)) {
      setEditingId(null);
      setForm(draft.form);
    } else {
      setEditingId(null);
      setForm(createInitialForm());
    }
    setFlagQuery('');
    setShowDatePicker(false);
    setShowCustomCurrencyBox(false);
    setIsSheetOpen(true);
  };

  const openEditTripModal = (trip) => {
    setEditingId(trip.id);
    setForm({
      title: trip.title,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      total_budget: trip.total_budget,
      currency: trip.currency,
      cover_emoji: trip.cover_emoji || '✈️',
      memo: trip.memo || '',
    });
    setFlagQuery('');
    setShowDatePicker(false);
    setShowCustomCurrencyBox(false);
    setIsSheetOpen(true);
  };

  // 국기 선택 시 대표 아이콘 변경 + 해당 국가의 현지 통화 자동 매칭
  const handleSelectFlagItem = (item) => {
    setForm((prev) => ({
      ...prev,
      cover_emoji: item.emoji,
      currency: item.currency && allCurrencies.some((c) => c.code === item.currency)
        ? item.currency
        : prev.currency,
    }));
  };

  const handleRegisterCustomCurrency = () => {
    const code = customCurrencyForm.code.trim().toUpperCase();
    const rate = Number(customCurrencyForm.rate);
    if (!code || !rate || rate <= 0) return;

    const entry = registerCustomCurrency({
      code,
      name: customCurrencyForm.name.trim() || `${code} 통화`,
      symbol: code,
      rate,
      flag: form.cover_emoji || '💱',
    });
    if (entry) {
      setForm((prev) => ({ ...prev, currency: entry.code }));
      setCustomCurrencyForm({ code: '', name: '', rate: '' });
      setShowCustomCurrencyBox(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.destination.trim()) return;
    await saveTrip({
      ...form,
      id: editingId || undefined,
    });
    closeAndClearDraft();
  };

  const handleEnterTrip = (tripId) => {
    setActiveTripId(tripId);
    navigate('/schedule');
  };

  const toggleArchiveStatus = async (trip) => {
    const nextStatus = trip.status === 'completed' ? 'planned' : 'completed';
    await saveTrip({ ...trip, status: nextStatus });
  };

  const tripSchedules = schedules
    .filter((s) => s.trip_id === activeTrip?.id)
    .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index);

  const tripExpenses = expenses.filter((e) => e.trip_id === activeTrip?.id);
  const totalSpentKrw = tripExpenses.reduce((acc, cur) => acc + (cur.krw_amount || 0), 0);
  const totalBudget = activeTrip?.total_budget || 1;
  const budgetRatio = Math.min(100, Math.round((totalSpentKrw / totalBudget) * 100));

  const dday = activeTrip ? calculateDday(activeTrip.start_date, activeTrip.end_date) : null;
  const durationDays = activeTrip
    ? getTripDurationDays(activeTrip.start_date, activeTrip.end_date)
    : 1;

  return (
    <div className="space-y-5">
      {/* 1. 메인 D-Day 히어로 대시보드 카드 (아직 여행 기간이 지나지 않은 대표 여행) */}
      {!activeTrip ? (
        <section className="glass-card rounded-3xl p-8 text-center space-y-3 border border-white/15">
          <p className="text-3xl">✈️</p>
          <h1 className="text-base font-bold text-white">예정된 여행 일정이 없습니다</h1>
          <p className="text-xs text-zinc-400">
            새로운 여행지를 등록하거나 하단 [추억] 탭에서 지난 여행을 확인해 보세요.
          </p>
          <button
            type="button"
            onClick={openNewTripModal}
            className="tap-target inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>새 여행 일정 등록하기</span>
          </button>
        </section>
      ) : (
        <section
          onClick={() => handleEnterTrip(activeTrip.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleEnterTrip(activeTrip.id)}
          className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-sky-500/20 via-indigo-500/15 to-zinc-900/90 border border-white/15 shadow-xl cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${
                    dday.state === 'ongoing'
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                  }`}
                >
                  {dday.label}
                </span>
                <span className="text-xs text-zinc-400">
                  {durationDays - 1 > 0
                    ? `${durationDays - 1}박 ${durationDays}일`
                    : '당일치기'}{' '}
                  · 기본 {activeTrip.currency}
                </span>
              </div>

              <h1 className="text-xl font-bold text-white leading-snug flex items-center gap-1.5">
                <span>{activeTrip.cover_emoji}</span>
                <span>{activeTrip.title}</span>
                <ChevronRight className="w-4 h-4 text-sky-400 shrink-0" />
              </h1>

              <p className="flex items-center gap-1.5 text-xs text-zinc-300 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{activeTrip.destination}</span>
                <span className="text-zinc-500">·</span>
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  {activeTrip.start_date} ~ {activeTrip.end_date}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditTripModal(activeTrip);
                }}
                aria-label="여행 정보 수정"
                className="tap-target inline-flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 text-zinc-200"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {activeTrip.memo && (
            <div className="mt-3.5 px-3.5 py-2.5 rounded-2xl bg-black/30 border border-white/10 text-xs text-zinc-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{activeTrip.memo}</span>
            </div>
          )}

          {/* 예산 & 일정 요약 바로가기 위젯 */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div
              onClick={(e) => {
                e.stopPropagation();
                setActiveTripId(activeTrip.id);
                navigate('/budget');
              }}
              className="tap-target text-left p-3.5 rounded-2xl bg-black/35 hover:bg-black/45 border border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" /> 예산 소진율
                </span>
                <span className="font-semibold text-white">{budgetRatio}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetRatio > 90
                      ? 'bg-rose-500'
                      : budgetRatio > 70
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${budgetRatio}%` }}
                />
              </div>
              <p className="text-xs font-semibold text-zinc-200 truncate">
                ₩{totalSpentKrw.toLocaleString()}{' '}
                <span className="text-zinc-500 font-normal">
                  / ₩{totalBudget.toLocaleString()}
                </span>
              </p>
            </div>

            <div className="tap-target text-left p-3.5 rounded-2xl bg-black/35 hover:bg-black/45 border border-white/10 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" /> 일정 상세 보기
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="mt-1">
                <p className="text-base font-bold text-white">{tripSchedules.length}개 일정</p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {tripSchedules[0]
                    ? `첫 일정: ${tripSchedules[0].place_name}`
                    : '탭하여 항공·숙소·장소 등록'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-sky-300 font-medium">
              카드를 터치하면 상세 일정으로 이동합니다 →
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleArchiveStatus(activeTrip);
              }}
              className="tap-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-zinc-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              <span>추억으로 이동</span>
            </button>
          </div>
        </section>
      )}

      {/* 2. 예정 및 진행 중인 여행 일정 리스트 (선택 시 해당 일정 상세로 즉시 진입) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold text-white">
              예정·진행 중인 여행 ({upcomingTrips.length})
            </h2>
            <p className="text-[11px] text-zinc-400">
              여행 일정을 선택하면 항공권·숙소·일자별 상세 일정으로 들어갑니다
            </p>
          </div>
          <button
            type="button"
            onClick={openNewTripModal}
            className="tap-target inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs shadow-lg shadow-sky-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>새 여행 등록</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {upcomingTrips.map((trip) => {
            const badge = calculateDday(trip.start_date, trip.end_date);
            const isSelected = trip.id === activeTrip?.id;
            return (
              <div
                key={trip.id}
                onClick={() => handleEnterTrip(trip.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleEnterTrip(trip.id)}
                className={`glass-card rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                  isSelected
                    ? 'ring-2 ring-sky-400/70 bg-sky-500/10'
                    : 'hover:bg-white/5 opacity-90'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                    {trip.cover_emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-400">{badge.label}</span>
                      <span className="text-[10px] text-zinc-400">
                        {trip.start_date} ~ {trip.end_date}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate mt-0.5">
                      {trip.title}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate">
                      {trip.destination} · 예산 ₩{Number(trip.total_budget || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditTripModal(trip);
                    }}
                    aria-label={`${trip.title} 수정`}
                    className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTrip(trip.id);
                    }}
                    aria-label={`${trip.title} 삭제`}
                    className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-zinc-500 ml-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 새 여행 등록 / 수정 네이티브 바텀 시트 */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={closeAndClearDraft}
        title={editingId ? '여행 정보 수정' : '새 여행 플랜 등록'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 대표 아이콘 (전 세계 국기 & 테마 아이콘 실시간 검색) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                대표 아이콘 (선택됨: <strong className="text-base text-white">{form.cover_emoji}</strong>)
              </span>
              <span className="text-[11px] text-zinc-500">전 세계 249개국 국기 지원</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="국가 또는 도시 검색 (예: 베트남, 다낭, 일본, 스위스...)"
                value={flagQuery}
                onChange={(e) => setFlagQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5">
              {filteredFlags.slice(0, 40).map((item) => {
                const isSelected = form.cover_emoji === item.emoji;
                return (
                  <button
                    key={`${item.code}-${item.emoji}`}
                    type="button"
                    onClick={() => handleSelectFlagItem(item)}
                    className={`tap-target shrink-0 px-2.5 py-1.5 rounded-2xl flex items-center gap-1.5 border transition-colors ${
                      isSelected
                        ? 'bg-sky-500/25 border-sky-400 text-white'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-lg leading-none">{item.emoji}</span>
                    <span className="text-[11px] font-medium whitespace-nowrap">{item.name}</span>
                  </button>
                );
              })}
              {filteredFlags.length === 0 && (
                <p className="text-xs text-zinc-500 py-2 px-1">
                  일치하는 국가가 없습니다. 한글 국가명(예: 베트남, 프랑스)으로 검색해 보세요.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">여행 제목</label>
              <input
                type="text"
                required
                placeholder="예: 다낭&호이안 3박 4일"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">목적지 (도시/국가)</label>
              <input
                type="text"
                required
                placeholder="예: 다낭&호이안, 베트남"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* 여행 기간 통합 선택 (한 화면 달력에서 출발일 ➔ 종료일 범위 선택 후 확인 버튼 등록) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-zinc-400">
                  여행 기간 (출발일 ~ 종료일)
                </label>
                <span className="text-[11px] font-semibold text-sky-400">
                  {(() => {
                    const days = getTripDurationDays(form.start_date, form.end_date);
                    return days <= 1 ? '당일치기 (1일)' : `${days - 1}박 ${days}일`;
                  })()}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDatePicker((v) => !v)}
                className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${
                  showDatePicker
                    ? 'bg-sky-500/10 border-sky-400/60 text-white'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Calendar size={16} className="text-sky-400 shrink-0" />
                  <div className="text-sm font-semibold truncate">
                    <span>{form.start_date}</span>
                    <span className="mx-2 text-zinc-500">→</span>
                    <span>{form.end_date}</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-sky-400 shrink-0 px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-400/20">
                  {showDatePicker ? '달력 닫기' : '달력 열기'}
                </span>
              </button>

              {showDatePicker && (
                <DateRangePicker
                  startDate={form.start_date}
                  endDate={form.end_date}
                  onConfirm={(nextStart, nextEnd) => {
                    setForm((prev) => ({
                      ...prev,
                      start_date: nextStart,
                      end_date: nextEnd,
                    }));
                    setShowDatePicker(false);
                  }}
                  onCancel={() => setShowDatePicker(false)}
                />
              )}
            </div>

            {/* 총 예산 / 현지 주 통화 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  총 예산 (원화 ₩ 기준)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="1,000,000"
                  value={formatCommaNumber(form.total_budget)}
                  onChange={(e) =>
                    setForm({ ...form, total_budget: stripCommaNumber(e.target.value) })
                  }
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-zinc-400">현지 주 통화</label>
                  <button
                    type="button"
                    onClick={() => setShowCustomCurrencyBox((v) => !v)}
                    className="text-[11px] font-semibold text-sky-400 hover:underline"
                  >
                    {showCustomCurrencyBox ? '닫기' : '+ 직접 추가'}
                  </button>
                </div>
                <select
                  value={form.currency}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_CUSTOM__') {
                      setShowCustomCurrencyBox(true);
                    } else {
                      setForm({ ...form, currency: e.target.value });
                    }
                  }}
                  className="w-full min-w-0 px-2.5 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                >
                  {allCurrencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.name})
                    </option>
                  ))}
                  <option value="__ADD_CUSTOM__">➕ 새 통화 직접 등록...</option>
                </select>
              </div>
            </div>

            {/* 미등록 통화 직접 추가 패널 */}
            {showCustomCurrencyBox && (
              <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-400/30 space-y-2.5">
                <p className="text-xs font-semibold text-sky-300">
                  새로운 현지 통화 & 환율 등록 (가계부 자동 연동)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="코드 (예: VND)"
                    value={customCurrencyForm.code}
                    onChange={(e) =>
                      setCustomCurrencyForm({ ...customCurrencyForm, code: e.target.value })
                    }
                    className="px-2.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white uppercase"
                  />
                  <input
                    type="text"
                    placeholder="통화명 (예: 동)"
                    value={customCurrencyForm.name}
                    onChange={(e) =>
                      setCustomCurrencyForm({ ...customCurrencyForm, name: e.target.value })
                    }
                    className="px-2.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="1단위당 원화(₩)"
                    value={customCurrencyForm.rate}
                    onChange={(e) =>
                      setCustomCurrencyForm({ ...customCurrencyForm, rate: e.target.value })
                    }
                    className="px-2.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">
                    예: 100동=5.5원이면 1단위당 <code>0.055</code> 입력
                  </span>
                  <button
                    type="button"
                    onClick={handleRegisterCustomCurrency}
                    className="px-3 py-1.5 rounded-xl bg-sky-400 text-zinc-950 font-bold text-xs"
                  >
                    통화 등록
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                체크리스트 / 핵심 메모
              </label>
              <textarea
                rows={2}
                placeholder="항공편 번호, 패스권, 숙소 체크인 시간 등 (다른 앱에 다녀와도 자동 보관됨)"
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="tap-target w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm shadow-lg shadow-sky-500/20"
          >
            {editingId ? '변경사항 저장하기' : '여행 플랜 시작하기'}
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
