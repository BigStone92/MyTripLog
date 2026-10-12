import { Outlet, NavLink } from 'react-router-dom';
import { Compass, MapPin, Wallet, BookOpen, ChevronDown } from 'lucide-react';
import SyncBadge from './SyncBadge';
import { useTripStore } from '../store/useTripStore';

const NAV_ITEMS = [
  { to: '/', label: '계획', icon: Compass },
  { to: '/schedule', label: '일정', icon: MapPin },
  { to: '/budget', label: '예산', icon: Wallet },
  { to: '/archive', label: '추억', icon: BookOpen },
];

export default function Layout() {
  const trips = useTripStore((s) => s.trips);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const setActiveTripId = useTripStore((s) => s.setActiveTripId);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];

  return (
    <div className="min-h-dvh max-w-lg mx-auto relative flex flex-col bg-[#0a0a0c] text-[#f5f5f7]">
      {/* 상단 고정 미니멀 헤더 (Apple HIG: 필수 상태 + 활성 여행 스위처만 유지) */}
      <header className="sticky top-0 z-30 glass-panel border-x-0 border-t-0 px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0" aria-hidden="true">
            {activeTrip?.cover_emoji || '✈️'}
          </span>
          <div className="relative min-w-0">
            <label htmlFor="active-trip-select" className="sr-only">
              현재 여행 선택
            </label>
            <select
              id="active-trip-select"
              value={activeTrip?.id || ''}
              onChange={(e) => setActiveTripId(e.target.value)}
              className="tap-target appearance-none bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl pl-3 pr-8 py-1.5 text-sm font-semibold text-white truncate max-w-[190px] sm:max-w-[240px] focus:outline-none focus:border-sky-400"
            >
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id} className="bg-zinc-900 text-white">
                  {trip.cover_emoji} {trip.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <SyncBadge />
      </header>

      {/* 메인 스크롤 영역 */}
      <main className="flex-1 px-4 pt-4 pb-safe-content">
        <Outlet />
      </main>

      {/* 하단 플로팅 아일랜드 네비게이션 (Thumb Zone Ergonomics & >= 44pt Touch Target) */}
      <nav
        aria-label="주요 메뉴"
        className="fixed left-4 right-4 max-w-md mx-auto bottom-island-safe glass-panel rounded-3xl px-2.5 py-1.5 flex items-center justify-around z-40 shadow-2xl shadow-black/80"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `tap-target flex-1 flex flex-col items-center justify-center py-1.5 rounded-2xl text-xs font-medium transition-all ${
                isActive
                  ? 'text-sky-400 bg-sky-500/15 shadow-inner border border-sky-400/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
