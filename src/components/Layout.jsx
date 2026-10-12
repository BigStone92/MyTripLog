import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, BookOpen } from 'lucide-react';
import SyncBadge from './SyncBadge';

const NAV_ITEMS = [
  { to: '/', label: '홈', subtitle: '예정·진행 여행', icon: Home },
  { to: '/archive', label: '추억', subtitle: '지난 여행 일정', icon: BookOpen },
];

export default function Layout() {
  const location = useLocation();
  const isDetailView =
    location.pathname.startsWith('/schedule') || location.pathname.startsWith('/budget');

  return (
    <div className="min-h-dvh max-w-lg mx-auto relative flex flex-col bg-[#0a0a0c] text-[#f5f5f7]">
      {/* 홈/추억 메인 탭에서만 기본 브랜드 헤더 표시 (일정 상세/가계부 화면은 자체 상단 네비게이션 헤더 사용) */}
      {!isDetailView && (
        <header className="sticky top-0 z-30 glass-panel border-x-0 border-t-0 px-4 pt-safe-header pb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0" aria-hidden="true">
              ✈️
            </span>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white">MyTripLog</h1>
              <p className="text-[11px] text-zinc-400">
                {location.pathname.startsWith('/archive')
                  ? '지난 여행의 추억과 기록'
                  : '다가오는 여행 대시보드'}
              </p>
            </div>
          </div>

          <SyncBadge />
        </header>
      )}

      {/* 메인 스크롤 영역 */}
      <main className={`flex-1 px-4 ${isDetailView ? 'pt-0' : 'pt-4'} pb-safe-content`}>
        <Outlet />
      </main>

      {/* 하단 플로팅 아일랜드 네비게이션: 홈(예정된 여행) / 추억(지난 여행) 2탭 체제 */}
      <nav
        aria-label="주요 메뉴"
        className="fixed left-4 right-4 max-w-md mx-auto bottom-island-safe glass-panel rounded-3xl px-2.5 py-1.5 flex items-center justify-around gap-2 z-40 shadow-2xl shadow-black/80"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `tap-target flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'text-sky-400 bg-sky-500/15 shadow-inner border border-sky-400/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
