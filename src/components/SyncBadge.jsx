import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useTripStore } from '../store/useTripStore';

export default function SyncBadge() {
  const isOnline = useTripStore((s) => s.isOnline);
  const isSyncing = useTripStore((s) => s.isSyncing);
  const pendingSyncCount = useTripStore((s) => s.pendingSyncCount);
  const flushSyncQueue = useTripStore((s) => s.flushSyncQueue);

  return (
    <button
      type="button"
      onClick={() => flushSyncQueue()}
      title="맥미니 홈서버와 지금 동기화"
      className={`tap-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        !isOnline
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          : pendingSyncCount > 0
          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
      }`}
    >
      {isSyncing ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
      ) : isOnline ? (
        <Cloud className="w-3.5 h-3.5" />
      ) : (
        <CloudOff className="w-3.5 h-3.5" />
      )}
      <span>
        {isSyncing
          ? '동기화 중'
          : !isOnline
          ? `오프라인${pendingSyncCount > 0 ? ` · 대기 ${pendingSyncCount}` : ''}`
          : pendingSyncCount > 0
          ? `대기 ${pendingSyncCount}건`
          : 'Mac mini 연동'}
      </span>
    </button>
  );
}
