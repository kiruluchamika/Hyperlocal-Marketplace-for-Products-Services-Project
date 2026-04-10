import apiClient from './client';
import { INotification, NotificationView } from '@/types';

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean; view?: NotificationView }) =>
    apiClient.get<{
      notifications: INotification[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>('/notifications', { params }),

  getUnreadCount: (params?: { view?: NotificationView }) =>
    apiClient.get<{ unreadCount: number }>('/notifications/unread-count', { params }),

  markRead: (id: string, params?: { view?: NotificationView }) =>
    apiClient.patch(`/notifications/${id}/read`, undefined, { params }),

  markAllRead: (params?: { view?: NotificationView }) =>
    apiClient.patch('/notifications/read-all', undefined, { params }),
};
