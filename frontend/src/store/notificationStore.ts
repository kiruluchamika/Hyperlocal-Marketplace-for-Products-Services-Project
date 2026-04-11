import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { notificationsApi } from '@/api/notifications';
import { INotification, NotificationView } from '@/types';
import { authStorage } from '@/utils/authStorage';

const matchesView = (notification: INotification, view: NotificationView) => {
  if (view === 'all') {
    return true;
  }

  if (view === 'admin') {
    return notification.recipientType === 'ADMIN_BROADCAST';
  }

  return notification.recipientType === 'USER';
};

interface NotificationState {
  notifications: INotification[];
  unreadCount: number;
  currentView: NotificationView;
  isLoading: boolean;
  unreadOnly: boolean;
  page: number;
  totalPages: number;
  total: number;
  isSocketConnected: boolean;
  initializeRealtime: () => void;
  disconnectRealtime: () => void;
  fetchUnreadCount: (view?: NotificationView) => Promise<void>;
  fetchNotifications: (params?: { page?: number; limit?: number; unreadOnly?: boolean; view?: NotificationView }) => Promise<void>;
  setView: (view: NotificationView) => void;
  setUnreadOnly: (value: boolean) => void;
  markAsRead: (id: string, view?: NotificationView) => Promise<void>;
  markAllAsRead: (view?: NotificationView) => Promise<void>;
  reset: () => void;
}

let socket: Socket | null = null;
let activeToken: string | null = null;

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  return window.location.origin;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  currentView: 'all',
  isLoading: false,
  unreadOnly: false,
  page: 1,
  totalPages: 1,
  total: 0,
  isSocketConnected: false,

  initializeRealtime: () => {
    const token = authStorage.getToken();

    if (!token) {
      get().disconnectRealtime();
      return;
    }

    if (socket && activeToken === token) {
      return;
    }

    get().disconnectRealtime();

    activeToken = token;
    socket = io(getSocketUrl(), {
      path: '/socket.io/',
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      set({ isSocketConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isSocketConnected: false });
    });

    socket.on('notification:new', (incoming: INotification) => {
      set((state) => {
        if (!matchesView(incoming, state.currentView)) {
          return state;
        }

        const alreadyExists = state.notifications.some((item) => item._id === incoming._id);
        const shouldInsert = !alreadyExists && (!state.unreadOnly || !incoming.isRead);

        const nextNotifications = shouldInsert
          ? [incoming, ...state.notifications]
          : state.notifications;

        const nextTotal = shouldInsert ? state.total + 1 : state.total;

        return {
          notifications: nextNotifications,
          unreadCount: incoming.isRead ? state.unreadCount : state.unreadCount + 1,
          total: nextTotal,
        };
      });
    });
  },

  disconnectRealtime: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    activeToken = null;
    set({ isSocketConnected: false });
  },

  fetchUnreadCount: async (view) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ unreadCount: 0 });
      return;
    }

    const targetView = view ?? get().currentView;

    try {
      const { data } = await notificationsApi.getUnreadCount({ view: targetView });
      set({ unreadCount: data.unreadCount ?? 0 });
    } catch {
      // Global API interceptor already handles messaging.
    }
  },

  fetchNotifications: async (params) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ notifications: [], unreadCount: 0, total: 0, totalPages: 1, page: 1 });
      return;
    }

    const page = params?.page ?? get().page;
    const unreadOnly = params?.unreadOnly ?? get().unreadOnly;
    const limit = params?.limit ?? 20;
    const view = params?.view ?? get().currentView;

    set({ isLoading: true });
    try {
      const { data } = await notificationsApi.getAll({ page, limit, unreadOnly, view });
      set({
        notifications: data.notifications,
        page: data.pagination.page,
        totalPages: data.pagination.totalPages,
        total: data.pagination.total,
        unreadOnly,
        currentView: view,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setView: (view) => {
    if (get().currentView === view) {
      return;
    }

    set({
      currentView: view,
      notifications: [],
      unreadCount: 0,
      page: 1,
      totalPages: 1,
      total: 0,
    });
  },

  setUnreadOnly: (value) => {
    set({ unreadOnly: value, page: 1 });
  },

  markAsRead: async (id: string, view) => {
    const targetView = view ?? get().currentView;
    const target = get().notifications.find((item) => item._id === id);
    if (!target || target.isRead) {
      return;
    }

    await notificationsApi.markRead(id, { view: targetView });

    set((state) => {
      const nextNotifications = state.unreadOnly
        ? state.notifications.filter((item) => item._id !== id)
        : state.notifications.map((item) => (item._id === id ? { ...item, isRead: true } : item));

      return {
        notifications: nextNotifications,
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    });

    socket?.emit('notification:acknowledged', id);
  },

  markAllAsRead: async (view) => {
    const targetView = view ?? get().currentView;
    const hasUnread = get().notifications.some((item) => !item.isRead) || get().unreadCount > 0;
    if (!hasUnread) {
      return;
    }

    await notificationsApi.markAllRead({ view: targetView });

    set((state) => ({
      notifications: state.unreadOnly
        ? []
        : state.notifications.map((item) => ({
            ...item,
            isRead: true,
          })),
      unreadCount: 0,
    }));
  },

  reset: () => {
    get().disconnectRealtime();
    set({
      notifications: [],
      unreadCount: 0,
      currentView: 'all',
      isLoading: false,
      unreadOnly: false,
      page: 1,
      totalPages: 1,
      total: 0,
    });
  },
}));
