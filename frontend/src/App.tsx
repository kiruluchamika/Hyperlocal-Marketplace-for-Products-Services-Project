import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import AppRouter from '@/routes/AppRouter';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initializeRealtime = useNotificationStore((s) => s.initializeRealtime);
  const disconnectRealtime = useNotificationStore((s) => s.disconnectRealtime);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const resetNotifications = useNotificationStore((s) => s.reset);

  useEffect(() => {
    initialize();
  }, [initialize]);

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

  return (
    <>
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
