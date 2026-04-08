import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiClock, FiShield } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { useSiteSettingsStore } from '@/store/siteSettingsStore';
import LogoutConfirmModal from '@/components/modals/LogoutConfirmModal';

const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const settings = useSiteSettingsStore((state) => state.settings);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [navigate, user?.role]);

  const handleAdminExit = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogoutAction = () => {
    setIsLogoutConfirmOpen(false);
    logout();
    window.location.href = '/admin/login';
  };

  if (window.location.pathname === '/admin/login') {
    return null;
  }

  if (user?.role === 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
          <FiClock size={28} />
        </div>

        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Scheduled Maintenance</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">{settings.maintenanceMessage}</p>

        <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm text-slate-300">
          <p className="font-semibold text-white">What this means right now</p>
          <p className="mt-2">The marketplace is temporarily unavailable while we complete system updates.</p>
        </div>

        {user?.role === 'admin' && (
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <FiShield size={16} /> Admin access is still available
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to="/admin" className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                Open Admin Panel
              </Link>
              <button
                type="button"
                onClick={handleAdminExit}
                className="rounded-xl border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10"
              >
                Log Out Admin Session
              </button>
            </div>
          </div>
        )}

        <LogoutConfirmModal
          isOpen={isLogoutConfirmOpen}
          onClose={() => setIsLogoutConfirmOpen(false)}
          onConfirm={confirmLogoutAction}
          title="Leave the admin session?"
          message="This will sign you out immediately and take you back to the admin login screen."
          confirmLabel="Yes, leave session"
        />
      </div>
    </div>
  );
};

export default MaintenancePage;
