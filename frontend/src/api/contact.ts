import apiClient from './client';
import type { ContactMessage, ContactSubmitPayload, ContactMessageStatus } from '@/types/contact';
import type { Pagination } from '@/types/admin';

export const contactApi = {
  submit: (payload: ContactSubmitPayload) =>
    apiClient.post<{ message: string; contact: ContactMessage }>('/contact', payload),

  getMyMessages: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ messages: ContactMessage[]; pagination: Pagination }>('/contact/my', { params }),
};

export const adminContactApi = {
  getMessages: (params?: {
    page?: number;
    limit?: number;
    status?: ContactMessageStatus;
    search?: string;
  }) => apiClient.get<{ messages: ContactMessage[]; pagination: Pagination }>('/admin/contacts', { params }),

  markReviewed: (id: string) =>
    apiClient.patch<{ message: string; contact: ContactMessage }>(`/admin/contacts/${id}/review`),

  reply: (id: string, replyMessage: string) =>
    apiClient.patch<{ message: string; contact: ContactMessage }>(`/admin/contacts/${id}/reply`, { replyMessage }),
};
