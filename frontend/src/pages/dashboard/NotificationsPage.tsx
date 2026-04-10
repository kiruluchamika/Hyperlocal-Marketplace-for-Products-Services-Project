import React, { useEffect } from 'react';
import { FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { Badge, Button, Spinner } from '@/components/ui';
import { NotificationType } from '@/types';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';

const typeToVariant: Record<NotificationType, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ORDER: 'info',
  PAYMENT: 'success',
  LISTING: 'primary',
  REVIEW: 'warning',
  USER: 'neutral',
  CATEGORY: 'warning',
  SYSTEM: 'danger',
  REPORT: 'danger',
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  const now = Date.now();
  const diffMs = now - date.getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) {
    return 'Just now';
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'Just now';
  }

  if (diffMs < hour) {
    const mins = Math.floor(diffMs / minute);
    return `${mins}m ago`;
  }

  if (diffMs < day) {
    const hrs = Math.floor(diffMs / hour);
    return `${hrs}h ago`;
  }

  const days = Math.floor(diffMs / day);
  return `${days}d ago`;
};

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    unreadOnly,
    page,
    totalPages,
    setView,
    setUnreadOnly,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAdminRoute = location.pathname.startsWith('/admin');
  const view = isAdminRoute && user?.role === 'admin' ? 'admin' : 'user';

  useEffect(() => {
    setView(view);
    fetchNotifications({ page: 1, unreadOnly, view });
    fetchUnreadCount(view);
  }, [fetchNotifications, fetchUnreadCount, setView, unreadOnly, view]);

  const handleToggleUnreadOnly = () => {
    setUnreadOnly(!unreadOnly);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) {
      return;
    }

    fetchNotifications({ page: nextPage, unreadOnly, view });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Keep track of orders, payments, listings, and important system updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleUnreadOnly}>
            {unreadOnly ? 'Show All' : 'Unread Only'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => markAllAsRead(view)} disabled={unreadCount === 0}>
            Mark All Read
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <span className="font-medium">Unread:</span>
        <Badge variant={unreadCount > 0 ? 'danger' : 'neutral'}>{unreadCount}</Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex min-h-60 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
              <FiBell className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">No notifications yet</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              You will see important updates from across the platform here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((item) => (
              <li key={item._id} className={`px-5 py-4 transition-colors ${item.isRead ? 'bg-white' : 'bg-indigo-50/30'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={typeToVariant[item.type]}>{item.type}</Badge>
                      {!item.isRead && <Badge variant="info">Unread</Badge>}
                      <span className="text-xs text-slate-400">{formatRelativeTime(item.createdAt)}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.message}</p>

                    {(item.entityType || item.entityId) && (
                      <p className="mt-2 text-xs text-slate-400">
                        Ref: {item.entityType ?? 'entity'} {item.entityId ?? ''}
                      </p>
                    )}
                  </div>

                  {!item.isRead && (
                    <button
                      onClick={() => markAsRead(item._id, view)}
                      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <FiCheck className="h-3.5 w-3.5" />
                      Mark read
                    </button>
                  )}

                  {item.isRead && (
                    <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-emerald-600">
                      <FiCheckCircle className="h-4 w-4" />
                      Read
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <span className="px-2 text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
