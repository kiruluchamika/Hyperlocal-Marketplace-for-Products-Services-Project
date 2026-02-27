import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import AppRouter from '@/routes/AppRouter';
import { useAuthStore } from '@/store/authStore';

function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

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
