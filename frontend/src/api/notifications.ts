import apiClient from './client';
import { INotification } from '@/types';

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    apiClient.get<{
      notifications: INotification[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>('/notifications', { params }),

  getUnreadCount: () =>
    apiClient.get<{ unreadCount: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.patch('/notifications/read-all'),
};
