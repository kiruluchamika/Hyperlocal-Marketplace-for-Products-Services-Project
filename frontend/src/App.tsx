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
            background: '#1e293b',
            color: '#fff',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#7c3aed', secondary: '#fff' },
          },
        }}
      />
      <AppRouter />
    </>
  );
}

export default App;
