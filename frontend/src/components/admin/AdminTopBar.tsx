import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { FiBell, FiUser } from 'react-icons/fi';

const AdminTopBar: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { notifications, unreadCount, isLoading, fetchNotifications, fetchUnreadCount } = useNotificationStore();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationsToggle = async () => {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);

    if (nextOpen) {
      await Promise.all([
        fetchNotifications({ page: 1, limit: 5, unreadOnly: false, view: 'admin' }),
        fetchUnreadCount('admin'),
      ]);
    }
  };

  const handleViewAllNotifications = () => {
    setIsNotificationsOpen(false);
    navigate('/admin/notifications');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-xl">
      <div>
        <h2 className="text-sm font-medium text-slate-500">Admin Panel</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={handleNotificationsToggle}
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <FiBell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <button
                    onClick={handleViewAllNotifications}
                    className="text-xs font-medium text-blue-400 hover:text-blue-300"
                  >
                    View all
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {isLoading ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {notifications.slice(0, 5).map((item) => (
                        <li key={item._id} className={`px-4 py-3 ${item.isRead ? 'bg-white' : 'bg-slate-50'}`}>
                          <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.message}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
            {user?.profileImage ? (
              <img src={user.profileImage} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <FiUser size={16} />
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
