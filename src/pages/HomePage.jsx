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
import { searchFlagsAndIcons } from '../services/countries.js';
import {
  calculateDday,
  formatCommaNumber,
  getMergedCurrencies,
  getTripDurationDays,
  stripCommaNumber,
  useTripStore,
} from '../store/useTripStore.js';

const TRIP_DRAFT_STORAGE_KEY = 'mytriplog_trip_form_draft_v1';

function createInitialForm() {
  const today = new Date().toISOString().slice(0, 10);
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

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];
  const allCurrencies = useMemo(
    () => Object.values(getMergedCurrencies(customCurrencies)),
    [customCurrencies]
  );

  // 앱 전환(카카오톡/사파리 백그라운드 등) 후 돌아와도 작성 중인 모달과 입력값 자동 복원
  const savedDraft = useMemo(() => loadSavedTripDraft(), []);
  const [isSheetOpen, setIsSheetOpen] = useState(() => Boolean(savedDraft?.isOpen));
  const [editingId, setEditingId] = useState(() => savedDraft?.editingId || null);
  const [form, setForm] = useState(() => savedDraft?.form || createInitialForm());

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
    setShowCustomCurrencyBox(false);
    setIsSheetOpen(true);
  };

  // 출발일 변경 시 종료일이 이전 날짜이거나 기존 출발일과 같으면 해당 연·월·일로 자동 이동
  const handleStartDateChange = (nextStartDate) => {
    setForm((prev) => {
      const shouldSyncEndDate =
        !prev.end_date || prev.end_date < nextStartDate || prev.end_date === prev.start_date;
      return {
        ...prev,
        start_date: nextStartDate,
        end_date: shouldSyncEndDate ? nextStartDate : prev.end_date,
      };
    });
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
      {/* 1. 메인 D-Day 히어로 대시보드 카드 */}
      {activeTrip && (
        <section className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-sky-500/20 via-indigo-500/15 to-zinc-900/90 border border-white/15 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${
                    dday.state === 'ongoing'
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : dday.state === 'upcoming'
                      ? 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                      : 'bg-zinc-500/20 text-zinc-300 border border-white/10'
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

              <h1 className="text-xl font-bold text-white leading-snug">
                {activeTrip.cover_emoji} {activeTrip.title}
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
                onClick={() => openEditTripModal(activeTrip)}
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
            <button
              type="button"
              onClick={() => navigate('/budget')}
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
            </button>

            <button
              type="button"
              onClick={() => navigate('/schedule')}
              className="tap-target text-left p-3.5 rounded-2xl bg-black/35 hover:bg-black/45 border border-white/10 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" /> 등록된 동선
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <div className="mt-1">
                <p className="text-base font-bold text-white">{tripSchedules.length}개 장소</p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {tripSchedules[0]
                    ? `첫 일정: ${tripSchedules[0].place_name}`
                    : '탭하여 첫 장소 추가'}
                </p>
              </div>
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              상태: {activeTrip.status === 'completed' ? '추억 보관됨' : '계획/진행 중'}
            </span>
            <button
              type="button"
              onClick={() => toggleArchiveStatus(activeTrip)}
              className="tap-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-zinc-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {activeTrip.status === 'completed' ? '계획 상태로 되돌리기' : '여행 완료 · 추억 아카이빙'}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* 2. 다가오는 동선 미리보기 */}
      <section className="glass-card rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">핵심 타임라인 프리뷰</h2>
          <button
            type="button"
            onClick={() => navigate('/schedule')}
            className="text-xs text-sky-400 hover:underline px-2 py-1"
          >
            지도 & 순서 편집 →
          </button>
        </div>

        {tripSchedules.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            아직 등록된 일정이 없습니다. [일정] 탭에서 장소를 검색해 추가해 보세요.
          </p>
        ) : (
          <div className="space-y-2">
            {tripSchedules.slice(0, 3).map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.place_name}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      Day {item.day_number} · {item.time_slot} · {item.memo || item.address}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. 전체 여행 리스트 & 새 여행 추가 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-zinc-200">내 여행 플랜 ({trips.length})</h2>
          <button
            type="button"
            onClick={openNewTripModal}
            className="tap-target inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>새 여행 등록</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {trips.map((trip) => {
            const badge = calculateDday(trip.start_date, trip.end_date);
            const isSelected = trip.id === activeTrip?.id;
            return (
              <div
                key={trip.id}
                onClick={() => setActiveTripId(trip.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveTripId(trip.id)}
                className={`glass-card rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-sky-400/70 bg-sky-500/10'
                    : 'hover:bg-white/5 opacity-85'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                    {trip.cover_emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-400">{badge.label}</span>
                      {trip.status === 'completed' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                          추억 보관
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{trip.title}</h3>
                    <p className="text-xs text-zinc-400 truncate">
                      {trip.destination} · ₩{Number(trip.total_budget || 0).toLocaleString()} · {trip.start_date} ~ {trip.end_date}
                    </p>
                  </div>
                </div>

                {trips.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTrip(trip.id);
                    }}
                    aria-label={`${trip.title} 삭제`}
                    className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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

            {/* 출발일 / 종료일 (iOS Safari 박스 겹침 방지 min-w-0 & 출발일 기준 종료일 자동 이동) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-zinc-400 mb-1">출발일</label>
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full min-w-0 max-w-full block px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-medium text-zinc-400 mb-1">종료일</label>
                <input
                  type="date"
                  required
                  min={form.start_date}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full min-w-0 max-w-full block px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>
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
