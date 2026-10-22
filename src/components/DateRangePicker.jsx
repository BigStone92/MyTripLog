import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react';
import { getTripDurationDays } from '../store/useTripStore.js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 5 - 1990 + 1 }, (_, i) => 1990 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i);

function formatYmd(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseYmd(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  return {
    year: y || new Date().getFullYear(),
    month: (m || 1) - 1,
    day: d || 1,
  };
}

export default function DateRangePicker({ startDate, endDate, onConfirm, onCancel }) {
  const initialParsed = parseYmd(startDate);
  const [viewYear, setViewYear] = useState(initialParsed.year);
  const [viewMonth, setViewMonth] = useState(initialParsed.month);

  const [draftStart, setDraftStart] = useState(startDate || '');
  const [draftEnd, setDraftEnd] = useState(endDate || startDate || '');
  // 첫 번째 탭은 출발일 지정, 두 번째 탭은 종료일 지정
  const [awaitingEnd, setAwaitingEnd] = useState(false);

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        day,
        dateStr: formatYmd(viewYear, viewMonth, day),
        dayOfWeek: (firstDayOfWeek + day - 1) % 7,
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (dateStr) => {
    if (!awaitingEnd || !draftStart) {
      // 1단계: 출발일 선택
      setDraftStart(dateStr);
      setDraftEnd('');
      setAwaitingEnd(true);
    } else {
      // 2단계: 종료일 선택 (만약 출발일보다 이전 날짜를 누르면 그 날짜를 새 출발일로 재지정)
      if (dateStr < draftStart) {
        setDraftStart(dateStr);
        setDraftEnd('');
        setAwaitingEnd(true);
      } else {
        setDraftEnd(dateStr);
        setAwaitingEnd(false);
      }
    }
  };

  const effectiveEnd = draftEnd || draftStart;
  const durationDays =
    draftStart && effectiveEnd ? getTripDurationDays(draftStart, effectiveEnd) : 1;

  const handleConfirm = () => {
    if (!draftStart) return;
    onConfirm(draftStart, effectiveEnd);
  };

  return (
    <div className="p-3.5 rounded-3xl bg-black/50 border border-sky-400/30 space-y-3.5">
      {/* 1. 상단 선택된 출발일 ~ 종료일 요약 헤더 */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10">
        <div
          className={`px-3 py-1.5 rounded-xl border transition-colors ${
            !awaitingEnd
              ? 'border-sky-400/50 bg-sky-500/15'
              : 'border-transparent bg-black/20'
          }`}
        >
          <span className="block text-[10px] text-zinc-400">출발일</span>
          <span className="text-xs font-bold text-white">{draftStart || '날짜 선택'}</span>
        </div>

        <div
          className={`px-3 py-1.5 rounded-xl border transition-colors ${
            awaitingEnd
              ? 'border-sky-400/60 bg-sky-500/20 animate-pulse'
              : 'border-transparent bg-black/20'
          }`}
        >
          <span className="block text-[10px] text-zinc-400">
            종료일{' '}
            {draftStart && !draftEnd ? (
              <strong className="text-sky-300">(선택해 주세요)</strong>
            ) : null}
          </span>
          <span className="text-xs font-bold text-white">
            {draftEnd || (draftStart ? `${draftStart} (당일)` : '날짜 선택')}
          </span>
        </div>
      </div>

      {/* 2. 연/월 네비게이션 바 (연도/월 즉시 점프 지원) */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label="이전 달"
          className="tap-target inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <select
            aria-label="연도 선택"
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-sky-400"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            aria-label="월 선택"
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-sky-400"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m + 1}월
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="다음 달"
          className="tap-target inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. 요일 헤더 & 달력 그리드 */}
      <div>
        <div className="grid grid-cols-7 text-center mb-1">
          {WEEKDAYS.map((w, idx) => (
            <span
              key={w}
              className={`text-[11px] font-semibold py-1 ${
                idx === 0 ? 'text-rose-400' : idx === 6 ? 'text-sky-400' : 'text-zinc-400'
              }`}
            >
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-10" />;
            }

            const { day, dateStr, dayOfWeek } = cell;
            const isStart = dateStr === draftStart;
            const isEnd = Boolean(draftEnd && dateStr === draftEnd);
            const isInRange = Boolean(
              draftStart && draftEnd && dateStr > draftStart && dateStr < draftEnd
            );

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(dateStr)}
                className={`h-10 relative flex flex-col items-center justify-center text-xs font-semibold transition-all select-none ${
                  isStart || isEnd
                    ? 'bg-sky-500 text-zinc-950 font-extrabold rounded-xl shadow-md shadow-sky-500/30 z-10'
                    : isInRange
                    ? 'bg-sky-500/20 text-sky-200'
                    : dayOfWeek === 0
                    ? 'text-rose-300 hover:bg-white/5 rounded-xl'
                    : dayOfWeek === 6
                    ? 'text-sky-300 hover:bg-white/5 rounded-xl'
                    : 'text-zinc-200 hover:bg-white/5 rounded-xl'
                }`}
              >
                <span>{day}</span>
                {(isStart || isEnd) && (
                  <span className="text-[8px] leading-none font-bold mt-0.5">
                    {isStart && isEnd ? '당일' : isStart ? '출발' : '종료'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. 하단 확인 / 닫기 버튼 */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          className="tap-target px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300"
        >
          닫기
        </button>

        <button
          type="button"
          disabled={!draftStart}
          onClick={handleConfirm}
          className="tap-target flex-1 py-2.5 px-4 rounded-2xl bg-sky-400 hover:bg-sky-300 disabled:opacity-40 text-zinc-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20"
        >
          <Check className="w-4 h-4" />
          <span>
            {durationDays - 1 > 0
              ? `${durationDays - 1}박 ${durationDays}일 일정 확인`
              : '당일치기 일정 확인'}
          </span>
        </button>
      </div>
    </div>
  );
}
