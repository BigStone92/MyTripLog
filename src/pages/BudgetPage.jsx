import { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Utensils,
  Train,
  BedDouble,
  ShoppingBag,
  Ticket,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import {
  formatCommaNumber,
  getMergedCurrencies,
  getTripDurationDays,
  stripCommaNumber,
  toKrwAmount,
  useTripStore,
} from '../store/useTripStore.js';

const EXPENSE_CATEGORIES = {
  food: {
    label: '식비',
    icon: Utensils,
    badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    bar: 'bg-amber-400',
  },
  transport: {
    label: '교통',
    icon: Train,
    badge: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    bar: 'bg-sky-400',
  },
  lodging: {
    label: '숙박',
    icon: BedDouble,
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    bar: 'bg-indigo-400',
  },
  shopping: {
    label: '쇼핑',
    icon: ShoppingBag,
    badge: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
    bar: 'bg-pink-400',
  },
  tour: {
    label: '관광/기타',
    icon: Ticket,
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    bar: 'bg-emerald-400',
  },
};

export default function BudgetPage() {
  const trips = useTripStore((s) => s.trips);
  const expenses = useTripStore((s) => s.expenses);
  const customCurrencies = useTripStore((s) => s.customCurrencies);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const saveExpense = useTripStore((s) => s.saveExpense);
  const deleteExpense = useTripStore((s) => s.deleteExpense);
  const isOnline = useTripStore((s) => s.isOnline);
  const pendingSyncCount = useTripStore((s) => s.pendingSyncCount);
  const flushSyncQueue = useTripStore((s) => s.flushSyncQueue);

  const currenciesMap = useMemo(
    () => getMergedCurrencies(customCurrencies),
    [customCurrencies]
  );

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];
  const durationDays = activeTrip
    ? getTripDurationDays(activeTrip.start_date, activeTrip.end_date)
    : 1;
  const dayOptions = Array.from({ length: durationDays }, (_, i) => i + 1);

  const [filterDay, setFilterDay] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    day_number: 1,
    title: '',
    amount: '',
    currency: activeTrip?.currency || 'KRW',
    category: 'food',
  });

  const tripExpenses = useMemo(
    () => expenses.filter((e) => e.trip_id === activeTrip?.id),
    [expenses, activeTrip?.id]
  );

  const filteredExpenses = useMemo(() => {
    if (filterDay === 'all') return tripExpenses;
    return tripExpenses.filter((e) => e.day_number === Number(filterDay));
  }, [tripExpenses, filterDay]);

  const totalSpentKrw = useMemo(
    () => tripExpenses.reduce((sum, item) => sum + (item.krw_amount || 0), 0),
    [tripExpenses]
  );

  const totalBudget = activeTrip?.total_budget || 1;
  const rawRatio = Math.round((totalSpentKrw / totalBudget) * 100);
  const progressWidth = Math.min(100, Math.max(0, rawRatio));
  const remainingKrw = totalBudget - totalSpentKrw;

  const categoryTotals = useMemo(() => {
    const map = { food: 0, transport: 0, lodging: 0, shopping: 0, tour: 0 };
    tripExpenses.forEach((e) => {
      const key = map[e.category] !== undefined ? e.category : 'tour';
      map[key] += e.krw_amount || 0;
    });
    return map;
  }, [tripExpenses]);

  const openAddSheet = () => {
    setForm({
      day_number: filterDay === 'all' ? 1 : Number(filterDay),
      title: '',
      amount: '',
      currency: activeTrip?.currency || 'KRW',
      category: 'food',
    });
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount || !activeTrip) return;
    await saveExpense({
      trip_id: activeTrip.id,
      day_number: Number(form.day_number),
      title: form.title,
      amount: Number(form.amount),
      currency: form.currency,
      category: form.category,
    });
    setIsAddOpen(false);
  };

  const previewKrw = toKrwAmount(form.amount, form.currency, customCurrencies);

  return (
    <div className="space-y-4">
      {/* 1. 예산 대비 지출 비율 메인 카드 & 프로그레스 바 */}
      <section className="glass-card rounded-3xl p-5 space-y-4 border border-white/15">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs text-zinc-400">총 지출 합계 (원화 환산)</span>
            <p className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
              ₩{totalSpentKrw.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              예산 ₩{totalBudget.toLocaleString()} 중{' '}
              <span
                className={`font-bold ${
                  rawRatio > 90
                    ? 'text-rose-400'
                    : rawRatio > 70
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {rawRatio}%
              </span>{' '}
              사용
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-zinc-400">
              {remainingKrw >= 0 ? '남은 예산' : '예산 초과'}
            </span>
            <p
              className={`text-sm font-bold mt-0.5 ${
                remainingKrw >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {remainingKrw >= 0
                ? `₩${remainingKrw.toLocaleString()}`
                : `-₩${Math.abs(remainingKrw).toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* 메인 예산 프로그레스 바 */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                rawRatio > 90
                  ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                  : rawRatio > 70
                  ? 'bg-gradient-to-r from-emerald-400 to-amber-400'
                  : 'bg-gradient-to-r from-sky-400 to-emerald-400'
              }`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>

        {/* 카테고리별 지출 비중 요약 */}
        <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-white/10">
          {Object.entries(EXPENSE_CATEGORIES).map(([key, meta]) => {
            const catAmount = categoryTotals[key] || 0;
            const catPct =
              totalSpentKrw > 0 ? Math.round((catAmount / totalSpentKrw) * 100) : 0;
            return (
              <div
                key={key}
                className="rounded-2xl bg-white/5 px-2 py-2 text-center border border-white/5"
              >
                <p className="text-[11px] font-medium text-zinc-300 truncate">{meta.label}</p>
                <p className="text-xs font-bold text-white mt-0.5">{catPct}%</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. 오프라인 / Background Sync 상태 안내 배너 */}
      {(!isOnline || pendingSyncCount > 0) && (
        <div className="rounded-2xl px-4 py-3 bg-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              오프라인 지출 내역 <strong>{pendingSyncCount}건</strong>이 IndexedDB에 안전하게 보관
              중입니다. 네트워크 연결 시 맥미니 서버와 자동 동기화됩니다.
            </span>
          </div>
          {isOnline && pendingSyncCount > 0 && (
            <button
              type="button"
              onClick={() => flushSyncQueue()}
              className="tap-target px-3 py-1.5 rounded-xl bg-amber-400 text-zinc-950 font-bold shrink-0"
            >
              지금 동기화
            </button>
          )}
        </div>
      )}

      {/* 3. 일자별 필터 & 지출 등록 버튼 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterDay('all')}
            className={`tap-target px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 border ${
              filterDay === 'all'
                ? 'bg-emerald-400 text-zinc-950 border-emerald-300'
                : 'bg-white/5 text-zinc-300 border-white/10'
            }`}
          >
            전체 ({tripExpenses.length})
          </button>
          {dayOptions.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setFilterDay(String(day))}
              className={`tap-target px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 border ${
                filterDay === String(day)
                  ? 'bg-emerald-400 text-zinc-950 border-emerald-300'
                  : 'bg-white/5 text-zinc-300 border-white/10'
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openAddSheet}
          className="tap-target inline-flex items-center gap-1 px-3.5 py-2 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs shrink-0 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>지출 입력</span>
        </button>
      </div>

      {/* 4. 지출 내역 리스트 */}
      <section className="space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center space-y-2">
            <p className="text-sm font-medium text-zinc-300">기록된 지출 내역이 없습니다</p>
            <p className="text-xs text-zinc-500">
              비행기 모드(오프라인)에서도 지출을 입력하면 로컬에 즉시 저장됩니다.
            </p>
          </div>
        ) : (
          filteredExpenses.map((item) => {
            const meta = EXPENSE_CATEGORIES[item.category] || EXPENSE_CATEGORIES.tour;
            const Icon = meta.icon;
            const sym = currenciesMap[item.currency]?.symbol || '';

            return (
              <div
                key={item.id}
                className="glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3 border border-white/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${meta.badge}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-zinc-400">
                        Day {item.day_number}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-[11px] text-zinc-400">{meta.label}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">
                      ₩{(item.krw_amount || 0).toLocaleString()}
                    </p>
                    {item.currency !== 'KRW' && (
                      <p className="text-[11px] text-zinc-400">
                        {sym}
                        {Number(item.amount).toLocaleString()} {item.currency}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteExpense(item.id)}
                    aria-label={`${item.title} 지출 삭제`}
                    className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* 5. 지출 입력 바텀 시트 */}
      <BottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="지출 내역 추가 (오프라인 자동 저장)"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">여행 일차</label>
              <select
                value={form.day_number}
                onChange={(e) => setForm({ ...form, day_number: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                {dayOptions.map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">카테고리</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                {Object.entries(EXPENSE_CATEGORIES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">통화</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                {Object.values(currenciesMap).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1">결제 금액</label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="0"
                value={formatCommaNumber(form.amount)}
                onChange={(e) => setForm({ ...form, amount: stripCommaNumber(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* 실시간 원화 환산 미리보기 */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-between text-xs">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              예산 반영 금액 (원화 자동 환산)
            </span>
            <span className="font-bold text-emerald-300">₩{previewKrw.toLocaleString()}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">지출 내역명</label>
            <input
              type="text"
              required
              placeholder="예: 이치란 라멘, 공항 철도 티켓, 편의점 간식"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <button
            type="submit"
            className="tap-target w-full py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-sm"
          >
            가계부에 저장하기
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
