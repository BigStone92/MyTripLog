import { create } from 'zustand';
import { macMiniApi } from '../services/api.js';
import { DEFAULT_CURRENCIES } from '../services/countries.js';
import {
  enqueueSyncAction,
  getSyncQueue,
  loadLocalSnapshot,
  removeSyncedActions,
  saveLocalSnapshot,
} from '../services/offlineDb.js';

const CUSTOM_CURRENCIES_KEY = 'mytriplog_custom_currencies';

function loadSavedCustomCurrencies() {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CURRENCIES_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getMergedCurrencies(customMap = {}) {
  return {
    ...DEFAULT_CURRENCIES,
    ...loadSavedCustomCurrencies(),
    ...customMap,
  };
}

export const EXCHANGE_RATES = Object.fromEntries(
  Object.entries(DEFAULT_CURRENCIES).map(([k, v]) => [k, v.rate])
);

export function toKrwAmount(amount, currency = 'KRW', customMap = {}) {
  const all = getMergedCurrencies(customMap);
  const rate = all[currency]?.rate ?? EXCHANGE_RATES[currency] ?? 1;
  const cleanAmount = typeof amount === 'string' ? Number(amount.replace(/,/g, '')) : Number(amount);
  return Math.round((cleanAmount || 0) * Number(rate));
}

export function stripCommaNumber(raw = '') {
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
}

export function formatCommaNumber(val) {
  if (val === '' || val === null || val === undefined) return '';
  const cleaned = stripCommaNumber(val);
  if (!cleaned) return '';
  const [intPart, decPart] = cleaned.split('.');
  const formattedInt = intPart ? Number(intPart).toLocaleString('en-US') : '0';
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

export function calculateDday(startDateStr, endDateStr) {
  if (!startDateStr) return { label: 'D-?', diff: 0, state: 'upcoming' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr || startDateStr}T00:00:00`);

  const diffDays = Math.round((start - today) / (1000 * 60 * 60 * 24));
  const endDiff = Math.round((end - today) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return { label: `D-${diffDays}`, diff: diffDays, state: 'upcoming' };
  }
  if (diffDays <= 0 && endDiff >= 0) {
    const dayNum = Math.abs(diffDays) + 1;
    return { label: `Day ${dayNum} 여행중`, diff: 0, state: 'ongoing' };
  }
  return { label: `D+${Math.abs(endDiff)}`, diff: endDiff, state: 'past' };
}

export function getTripDurationDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 1;
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(days, 30));
}

const FALLBACK_SNAPSHOT = {
  trips: [
    {
      id: 'trip-tokyo-2026',
      title: '도쿄 가을 미식 & 미술관 투어',
      destination: '도쿄, 일본',
      start_date: '2026-10-24',
      end_date: '2026-10-27',
      total_budget: 1200000,
      currency: 'JPY',
      cover_emoji: '🇯🇵',
      status: 'planned',
      memo: '시부야 스카이 선셋 예약 완료. 스이카 카드 충전 필수!',
      photos: [],
      updated_at: new Date().toISOString(),
    },
    {
      id: 'trip-jeju-archive',
      title: '제주 서쪽 해안도로 힐링 여행',
      destination: '제주도, 대한민국',
      start_date: '2026-05-15',
      end_date: '2026-05-18',
      total_budget: 800000,
      currency: 'KRW',
      cover_emoji: '🇰🇷',
      status: 'completed',
      memo: '협재 해수욕장 노을이 정말 아름다웠던 여행. 다음엔 우도에서 1박 하기!',
      photos: [
        {
          id: 'photo-1',
          caption: '협재 에메랄드빛 바다와 비양도',
          date: '2026-05-16',
          url: 'https://images.unsplash.com/photo-1548115184-bc6544d06a58?auto=format&fit=crop&w=800&q=80',
        },
      ],
      updated_at: new Date().toISOString(),
    },
  ],
  schedules: [
    {
      id: 'sch-1',
      trip_id: 'trip-tokyo-2026',
      day_number: 1,
      order_index: 0,
      place_name: '나리타 국제공항 제1터미널',
      category: 'transit',
      time_slot: '11:30',
      lat: 35.7719,
      lng: 140.3929,
      address: 'Chiba, Narita',
      memo: '스카이라이너 탑승',
    },
    {
      id: 'sch-2',
      trip_id: 'trip-tokyo-2026',
      day_number: 1,
      order_index: 1,
      place_name: '시부야 스카이 (SHIBUYA SKY)',
      category: 'spot',
      time_slot: '15:00',
      lat: 35.658,
      lng: 139.7016,
      address: '2-24-12 Shibuya, Tokyo',
      memo: 'QR 티켓 오프라인 캡처 준비',
    },
  ],
  expenses: [
    {
      id: 'exp-1',
      trip_id: 'trip-tokyo-2026',
      day_number: 1,
      title: '스카이라이너 왕복권',
      amount: 5400,
      currency: 'JPY',
      krw_amount: 49680,
      category: 'transport',
      spent_at: '2026-10-24T11:45:00',
    },
  ],
};

export const useTripStore = create((set, get) => ({
  trips: [],
  schedules: [],
  expenses: [],
  customCurrencies: loadSavedCustomCurrencies(),
  activeTripId: 'trip-tokyo-2026',
  selectedDay: 1,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingSyncCount: 0,
  lastSyncedAt: null,

  setOnlineStatus: (isOnline) => set({ isOnline }),
  setActiveTripId: (id) => {
    set({ activeTripId: id, selectedDay: 1 });
    get().persistLocal();
  },
  setSelectedDay: (day) => set({ selectedDay: day }),

  registerCustomCurrency: (currencyObj) => {
    const code = currencyObj.code.trim().toUpperCase();
    if (!code) return null;
    const entry = {
      code,
      name: currencyObj.name?.trim() || `${code} 통화`,
      symbol: currencyObj.symbol?.trim() || code,
      rate: Number(currencyObj.rate) || 1,
      flag: currencyObj.flag || '💱',
    };
    const nextCustom = { ...get().customCurrencies, [code]: entry };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_CURRENCIES_KEY, JSON.stringify(nextCustom));
    }
    set({ customCurrencies: nextCustom });
    return entry;
  },

  persistLocal: async () => {
    const { trips, schedules, expenses, activeTripId, lastSyncedAt } = get();
    await saveLocalSnapshot({ trips, schedules, expenses, activeTripId, lastSyncedAt });
  },

  initApp: async () => {
    const cached = await loadLocalSnapshot();
    const queue = await getSyncQueue();
    if (cached && cached.trips?.length) {
      set({
        trips: cached.trips,
        schedules: cached.schedules || [],
        expenses: cached.expenses || [],
        activeTripId: cached.activeTripId || cached.trips[0]?.id,
        lastSyncedAt: cached.lastSyncedAt || null,
        pendingSyncCount: queue.length,
      });
    } else {
      set({
        ...FALLBACK_SNAPSHOT,
        activeTripId: FALLBACK_SNAPSHOT.trips[0].id,
        pendingSyncCount: queue.length,
      });
      await saveLocalSnapshot({
        ...FALLBACK_SNAPSHOT,
        activeTripId: FALLBACK_SNAPSHOT.trips[0].id,
      });
    }

    await get().flushSyncQueue();
  },

  recordMutation: async (entity, action, payload) => {
    const item = {
      id: crypto.randomUUID(),
      entity,
      action,
      payload,
      created_at: new Date().toISOString(),
    };
    await enqueueSyncAction(item);
    await get().persistLocal();
    const queue = await getSyncQueue();
    set({ pendingSyncCount: queue.length });

    if (get().isOnline) {
      await get().flushSyncQueue();
    }
  },

  saveTrip: async (tripData) => {
    const now = new Date().toISOString();
    const existing = get().trips.find((t) => t.id === tripData.id);
    const cleanBudget = Number(stripCommaNumber(tripData.total_budget)) || 1000000;
    const trip = {
      id: tripData.id || `trip-${crypto.randomUUID().slice(0, 8)}`,
      title: tripData.title.trim(),
      destination: tripData.destination.trim(),
      start_date: tripData.start_date,
      end_date: tripData.end_date || tripData.start_date,
      total_budget: cleanBudget,
      currency: tripData.currency || 'KRW',
      cover_emoji: tripData.cover_emoji || '✈️',
      status: tripData.status || existing?.status || 'planned',
      memo: tripData.memo !== undefined ? tripData.memo : existing?.memo || '',
      photos: tripData.photos !== undefined ? tripData.photos : existing?.photos || [],
      updated_at: now,
    };

    const nextTrips = existing
      ? get().trips.map((t) => (t.id === trip.id ? trip : t))
      : [trip, ...get().trips];

    set({ trips: nextTrips, activeTripId: trip.id, selectedDay: 1 });
    await get().recordMutation('trip', 'upsert', trip);
    return trip;
  },

  deleteTrip: async (tripId) => {
    const nextTrips = get().trips.filter((t) => t.id !== tripId);
    const nextSchedules = get().schedules.filter((s) => s.trip_id !== tripId);
    const nextExpenses = get().expenses.filter((e) => e.trip_id !== tripId);
    const nextActive =
      get().activeTripId === tripId ? nextTrips[0]?.id || null : get().activeTripId;

    set({
      trips: nextTrips,
      schedules: nextSchedules,
      expenses: nextExpenses,
      activeTripId: nextActive,
    });
    await get().recordMutation('trip', 'delete', { id: tripId });
  },

  saveSchedule: async (scheduleData) => {
    const now = new Date().toISOString();
    const tripId = scheduleData.trip_id || get().activeTripId;
    const dayNumber = Number(scheduleData.day_number || get().selectedDay || 1);
    const dayItems = get().schedules.filter(
      (s) => s.trip_id === tripId && s.day_number === dayNumber
    );
    const existing = get().schedules.find((s) => s.id === scheduleData.id);

    const item = {
      id: scheduleData.id || `sch-${crypto.randomUUID().slice(0, 8)}`,
      trip_id: tripId,
      day_number: dayNumber,
      order_index:
        scheduleData.order_index !== undefined ? scheduleData.order_index : dayItems.length,
      place_name: scheduleData.place_name.trim(),
      category: scheduleData.category || 'spot',
      time_slot: scheduleData.time_slot || '10:00',
      lat: Number(scheduleData.lat) || 35.6762,
      lng: Number(scheduleData.lng) || 139.6503,
      address: scheduleData.address || '',
      memo: scheduleData.memo || '',
      updated_at: now,
    };

    const nextSchedules = existing
      ? get().schedules.map((s) => (s.id === item.id ? item : s))
      : [...get().schedules, item];

    set({ schedules: nextSchedules });
    await get().recordMutation('schedule', 'upsert', item);
    return item;
  },

  reorderSchedules: async (tripId, dayNumber, orderedItems) => {
    const now = new Date().toISOString();
    const updatedDayItems = orderedItems.map((item, idx) => ({
      ...item,
      order_index: idx,
      updated_at: now,
    }));

    const others = get().schedules.filter(
      (s) => !(s.trip_id === tripId && s.day_number === dayNumber)
    );
    set({ schedules: [...others, ...updatedDayItems] });
    await get().recordMutation('schedule_reorder', 'upsert', { items: updatedDayItems });
  },

  deleteSchedule: async (scheduleId) => {
    set({ schedules: get().schedules.filter((s) => s.id !== scheduleId) });
    await get().recordMutation('schedule', 'delete', { id: scheduleId });
  },

  saveExpense: async (expenseData) => {
    const now = new Date().toISOString();
    const currency = expenseData.currency || 'KRW';
    const amount = Number(stripCommaNumber(expenseData.amount)) || 0;
    const item = {
      id: expenseData.id || `exp-${crypto.randomUUID().slice(0, 8)}`,
      trip_id: expenseData.trip_id || get().activeTripId,
      day_number: Number(expenseData.day_number || get().selectedDay || 1),
      title: expenseData.title.trim(),
      amount,
      currency,
      krw_amount: toKrwAmount(amount, currency, get().customCurrencies),
      category: expenseData.category || 'food',
      spent_at: expenseData.spent_at || now,
      updated_at: now,
    };

    const existing = get().expenses.find((e) => e.id === item.id);
    const nextExpenses = existing
      ? get().expenses.map((e) => (e.id === item.id ? item : e))
      : [item, ...get().expenses];

    set({ expenses: nextExpenses });
    await get().recordMutation('expense', 'upsert', item);
    return item;
  },

  deleteExpense: async (expenseId) => {
    set({ expenses: get().expenses.filter((e) => e.id !== expenseId) });
    await get().recordMutation('expense', 'delete', { id: expenseId });
  },

  flushSyncQueue: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      const queue = await getSyncQueue();
      let snapshot;
      if (queue.length > 0) {
        snapshot = await macMiniApi.syncBatch(queue);
        await removeSyncedActions(snapshot.applied_action_ids || queue.map((q) => q.id));
      } else {
        snapshot = await macMiniApi.fetchBootstrap();
      }

      const remaining = await getSyncQueue();
      const currentActive = get().activeTripId;
      const validActive =
        snapshot.trips.find((t) => t.id === currentActive)?.id || snapshot.trips[0]?.id || null;

      set({
        trips: snapshot.trips,
        schedules: snapshot.schedules,
        expenses: snapshot.expenses,
        activeTripId: validActive,
        pendingSyncCount: remaining.length,
        lastSyncedAt: snapshot.synced_at,
        isOnline: true,
      });
      await get().persistLocal();
    } catch {
      const remaining = await getSyncQueue();
      set({ pendingSyncCount: remaining.length });
    } finally {
      set({ isSyncing: false });
    }
  },
}));
