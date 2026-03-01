import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { FiBell, FiUser } from 'react-icons/fi';

const AdminTopBar: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-6 backdrop-blur-xl">
      <div>
        <h2 className="text-sm font-medium text-slate-400">Admin Panel</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <FiBell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
            {user?.profileImage ? (
              <img src={user.profileImage} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <FiUser size={16} />
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
