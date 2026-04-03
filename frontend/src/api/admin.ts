import apiClient from './client';
import type {
  DashboardData,
  ChartData,
  AdminUser,
  AdminOrder,
  AdminPayment,
  AdminBooking,
  AdminListing,
  Pagination,
} from '@/types/admin';
import type { ContactMessage, ContactMessageStatus } from '@/types/contact';

export const adminApi = {
  /* ── Dashboard ── */
  getStats: () =>
    apiClient.get<DashboardData>('/admin/stats'),

  getChartData: () =>
    apiClient.get<ChartData>('/admin/stats/charts'),

  /* ── Users ── */
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) =>
    apiClient.get<{ users: AdminUser[]; pagination: Pagination }>('/admin/users', { params }),

  updateUserStatus: (id: string, action: 'suspend' | 'activate') =>
    apiClient.patch<{ message: string; user: AdminUser }>(`/admin/users/${id}/status`, { action }),

  /* ── Orders ── */
  getOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<{ orders: AdminOrder[]; pagination: Pagination }>('/admin/orders', { params }),

  /* ── Payments ── */
  getPayments: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<{ payments: AdminPayment[]; pagination: Pagination }>('/admin/payments', { params }),

  /* ── Bookings ── */
  getBookings: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<{ bookings: AdminBooking[]; pagination: Pagination }>('/admin/bookings', { params }),

  /* ── Listings ── */
  getListings: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get<{ listings: AdminListing[]; pagination: Pagination }>('/admin/listings', { params }),

  suspendListing: (id: string, reason: string) =>
    apiClient.patch<{ message: string; listing: AdminListing }>(`/admin/listings/${id}/suspend`, { reason }),

  approveListing: (id: string) =>
    apiClient.patch<{ message: string; listing: AdminListing }>(`/admin/listings/${id}/approve`),

  /* ── Contact Requests ── */
  getContactRequests: (params?: { page?: number; limit?: number; status?: ContactMessageStatus; search?: string }) =>
    apiClient.get<{ messages: ContactMessage[]; pagination: Pagination }>('/admin/contacts', { params }),

  markContactReviewed: (id: string) =>
    apiClient.patch<{ message: string; contact: ContactMessage }>(`/admin/contacts/${id}/review`),

  replyToContact: (id: string, replyMessage: string) =>
    apiClient.patch<{ message: string; contact: ContactMessage }>(`/admin/contacts/${id}/reply`, { replyMessage }),
};
