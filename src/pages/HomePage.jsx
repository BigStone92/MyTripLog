import { useState } from 'react';
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
} from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import {
  calculateDday,
  getTripDurationDays,
  useTripStore,
} from '../store/useTripStore';

const EMOJI_OPTIONS = ['✈️', '🗼', '🍊', '🏖️', '🏔️', '🗽', '🥐', '⛩️', '🏕️', '🚢'];
const CURRENCY_OPTIONS = [
  { code: 'KRW', label: '🇰🇷 KRW (원)' },
  { code: 'JPY', label: '🇯🇵 JPY (엔)' },
  { code: 'USD', label: '🇺🇸 USD (달러)' },
  { code: 'EUR', label: '🇪🇺 EUR (유로)' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const trips = useTripStore((s) => s.trips);
  const schedules = useTripStore((s) => s.schedules);
  const expenses = useTripStore((s) => s.expenses);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const setActiveTripId = useTripStore((s) => s.setActiveTripId);
  const saveTrip = useTripStore((s) => s.saveTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    destination: '',
    start_date: '2026-11-01',
    end_date: '2026-11-04',
    total_budget: 1000000,
    currency: 'KRW',
    cover_emoji: '✈️',
    memo: '',
  });

  const openNewTripModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditingId(null);
    setForm({
      title: '',
      destination: '',
      start_date: today,
      end_date: today,
      total_budget: 1000000,
      currency: 'KRW',
      cover_emoji: '✈️',
      memo: '',
    });
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
    setIsSheetOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.destination.trim()) return;
    await saveTrip({
      ...form,
      id: editingId || undefined,
    });
    setIsSheetOpen(false);
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

              <p className="flex items-center gap-1.5 text-xs text-zinc-300">
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
                      {trip.destination} · {trip.start_date} ~ {trip.end_date}
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
        onClose={() => setIsSheetOpen(false)}
        title={editingId ? '여행 정보 수정' : '새 여행 플랜 등록'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="block text-xs font-medium text-zinc-400 mb-2">대표 아이콘</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm({ ...form, cover_emoji: emoji })}
                  className={`tap-target rounded-2xl text-xl flex items-center justify-center border ${
                    form.cover_emoji === emoji
                      ? 'bg-sky-500/20 border-sky-400'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">여행 제목</label>
              <input
                type="text"
                required
                placeholder="예: 오사카 3박 4일 식도락 여행"
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
                placeholder="예: 오사카, 일본"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">출발일</label>
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">종료일</label>
                <input
                  type="date"
                  required
                  min={form.start_date}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  총 예산 (원화 ₩ 기준)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={form.total_budget}
                  onChange={(e) => setForm({ ...form, total_budget: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">현지 주 통화</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                체크리스트 / 핵심 메모
              </label>
              <textarea
                rows={2}
                placeholder="항공편 번호, 패스권, 숙소 체크인 시간 등"
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
