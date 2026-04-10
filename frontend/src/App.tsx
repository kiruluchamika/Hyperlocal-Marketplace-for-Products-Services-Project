import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import AppRouter from '@/routes/AppRouter';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useSiteSettingsStore } from '@/store/siteSettingsStore';

function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const initializeRealtime = useNotificationStore((s) => s.initializeRealtime);
  const disconnectRealtime = useNotificationStore((s) => s.disconnectRealtime);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const resetNotifications = useNotificationStore((s) => s.reset);
  const settings = useSiteSettingsStore((s) => s.settings);
  const settingsLoading = useSiteSettingsStore((s) => s.isLoading);
  const startSettingsPolling = useSiteSettingsStore((s) => s.startPolling);
  const stopSettingsPolling = useSiteSettingsStore((s) => s.stopPolling);
  const [maintenanceDeadline, setMaintenanceDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const maintenanceNoticeRef = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    startSettingsPolling();

    return () => {
      stopSettingsPolling();
    };
  }, [startSettingsPolling, stopSettingsPolling]);

  useEffect(() => {
    if (!isAuthenticated) {
      resetNotifications();
      return;
    }

    initializeRealtime();
    fetchUnreadCount();

    return () => {
      disconnectRealtime();
    };
  }, [disconnectRealtime, fetchUnreadCount, initializeRealtime, isAuthenticated, resetNotifications]);

  useEffect(() => {
    const path = window.location.pathname;
    const isAdmin = user?.role === 'admin';
    const isAdminAuthPath = path === '/admin/login';

    if (settingsLoading) {
      return;
    }

    if (!settings.maintenanceEnabled) {
      setMaintenanceDeadline(null);
      setSecondsLeft(0);
      maintenanceNoticeRef.current = false;

      if (path === '/maintenance') {
        window.location.replace('/');
      }

      return;
    }

    if (isAdminAuthPath) {
      setMaintenanceDeadline(null);
      setSecondsLeft(0);
      maintenanceNoticeRef.current = false;
      return;
    }

    if (isAdmin) {
      setMaintenanceDeadline(null);
      setSecondsLeft(0);
      maintenanceNoticeRef.current = false;

      if (path === '/maintenance') {
        window.location.replace('/admin');
      }

      return;
    }

    if (path !== '/maintenance') {
      window.location.replace('/maintenance');
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    if (!maintenanceNoticeRef.current) {
      const graceSeconds = Math.max(10, settings.maintenanceGraceSeconds || 60);
      setMaintenanceDeadline(Date.now() + graceSeconds * 1000);
      setSecondsLeft(graceSeconds);
      maintenanceNoticeRef.current = true;
      toast.error(`Maintenance mode is active. You will be logged out in ${graceSeconds} seconds.`);
    }
  }, [isAuthenticated, settings.maintenanceEnabled, settings.maintenanceGraceSeconds, settingsLoading, user?.role]);

  useEffect(() => {
    if (!maintenanceDeadline || !settings.maintenanceEnabled || user?.role === 'admin') {
      return;
    }

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((maintenanceDeadline - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        window.clearInterval(interval);
        logout();
        window.location.replace('/maintenance');
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [logout, maintenanceDeadline, settings.maintenanceEnabled, user?.role]);

  return (
    <>
      {settings.maintenanceEnabled && maintenanceDeadline && user?.role !== 'admin' && (
        <div className="fixed inset-x-0 top-0 z-[70] border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
          Maintenance mode is active. Your session will end in {secondsLeft}s.
        </div>
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#ffffff',
            color: '#1e293b',
            fontSize: '14px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            border: '1px solid #f1f5f9',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      <AppRouter />
    </>
  );
}

export default App;
