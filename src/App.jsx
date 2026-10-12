import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SchedulePage from './pages/SchedulePage';
import BudgetPage from './pages/BudgetPage';
import ArchivePage from './pages/ArchivePage';
import { useTripStore } from './store/useTripStore';

export default function App() {
  const initApp = useTripStore((s) => s.initApp);
  const setOnlineStatus = useTripStore((s) => s.setOnlineStatus);
  const flushSyncQueue = useTripStore((s) => s.flushSyncQueue);

  useEffect(() => {
    initApp();

    const handleOnline = () => {
      setOnlineStatus(true);
      flushSyncQueue();
    };
    const handleOffline = () => setOnlineStatus(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        flushSyncQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [initApp, setOnlineStatus, flushSyncQueue]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
