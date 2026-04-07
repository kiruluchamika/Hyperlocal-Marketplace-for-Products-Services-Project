import apiClient from './client';
import { IServiceBooking, IServiceBookingSlot, IServiceSelling } from '@/types';
import { IReviewSummary, IServiceReview, IWebsiteReview, ReviewSort } from '@/types/review';

export const servicesApi = {
  getAll: (params?: {
    categoryId?: string;
    search?: string;
    pricingType?: 'FIXED' | 'HOURLY';
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<{ success: boolean; data: IServiceSelling[] }>('/serviceselling', { params }),

  getMyServices: () =>
    apiClient.get<{ success: boolean; data: IServiceSelling[] }>('/serviceselling/me'),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: IServiceSelling }>(`/serviceselling/${id}`),

  create: (data: Partial<IServiceSelling>) =>
    apiClient.post<{ success: boolean; data: IServiceSelling }>('/serviceselling', data),

  update: (id: string, data: Partial<IServiceSelling>) =>
    apiClient.put<{ success: boolean; data: IServiceSelling }>(`/serviceselling/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/serviceselling/${id}`),

  moderate: (id: string, reason: string) =>
    apiClient.patch(`/serviceselling/${id}/moderate`, { reason }),

  // Admin
  getAllAdmin: (params?: Record<string, unknown>) =>
    apiClient.get<{ success: boolean; data: IServiceSelling[] }>('/serviceselling/admin', { params }),
};

export const bookingsApi = {
  create: (data: { serviceId: string; startAt: string; durationMinutes: number; note?: string }) =>
    apiClient.post<{ success: boolean; data: IServiceBooking }>('/servicebookings', data),

  getMyBookings: (params?: { status?: string }) =>
    apiClient.get<{ success: boolean; data: IServiceBooking[] }>('/servicebookings/me', { params }),

  getProviderBookings: (params?: { status?: string }) =>
    apiClient.get<{ success: boolean; data: IServiceBooking[] }>('/servicebookings/provider/me', { params }),

  getSlots: (params: { serviceId: string; from?: string; to?: string }) =>
    apiClient.get<{ success: boolean; data: IServiceBookingSlot[] }>('/servicebookings/slots', { params }),

  cancel: (id: string) =>
    apiClient.patch(`/servicebookings/${id}/cancel`),

  decision: (id: string, decision: 'ACCEPT' | 'REJECT') =>
    apiClient.patch(`/servicebookings/${id}/decision`, { action: decision }),

  initiateDeposit: (id: string) =>
    apiClient.post<{
      success: boolean;
      data: { clientSecret: string; amount: number; currency: string; paymentIntentId?: string };
    }>(`/servicebookings/${id}/deposit/initiate`),

  confirmDeposit: (id: string, paymentIntentId: string) =>
    apiClient.post<{ success: boolean; data: IServiceBooking }>(`/servicebookings/${id}/deposit/confirm`, {
      paymentIntentId,
    }),
};

export const reviewsApi = {
  listByService: (
    serviceId: string,
    params?: { page?: number; limit?: number; sortBy?: ReviewSort; rating?: number }
  ) =>
    apiClient.get<{
      success: boolean;
      data: IServiceReview[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/reviews/service/${serviceId}`, { params }),

  getSummaryByService: (serviceId: string) =>
    apiClient.get<{ success: boolean; data: IReviewSummary }>(`/reviews/service/${serviceId}/summary`),

  getMyReviewByService: (serviceId: string) =>
    apiClient.get<{ success: boolean; data: IServiceReview | null }>(`/reviews/service/${serviceId}/me`),

  create: (payload: { serviceId: string; rating: number; title?: string; content: string; bookingId?: string }) =>
    apiClient.post<{ success: boolean; data: IServiceReview }>('/reviews', payload),

  update: (id: string, payload: { rating?: number; title?: string; content?: string }) =>
    apiClient.patch<{ success: boolean; data: IServiceReview }>(`/reviews/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/reviews/${id}`),

  reply: (id: string, content: string) =>
    apiClient.post<{ success: boolean; data: IServiceReview }>(`/reviews/${id}/reply`, { content }),

  voteHelpful: (id: string) =>
    apiClient.post<{ success: boolean; data: { reviewId: string; helpfulCount: number; voted: boolean } }>(
      `/reviews/${id}/helpful`,
      { action: 'TOGGLE' }
    ),

  listAdmin: (params?: { page?: number; limit?: number; status?: 'PUBLISHED' | 'HIDDEN'; serviceId?: string; search?: string }) =>
    apiClient.get<{
      success: boolean;
      data: IServiceReview[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/reviews/admin/list', { params }),

  moderate: (id: string, payload: { action: 'HIDE' | 'RESTORE'; reason?: string }) =>
    apiClient.patch<{ success: boolean; data: IServiceReview }>(`/reviews/${id}/moderate`, payload),

  deleteByAdmin: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/reviews/${id}/admin`),
};

export const websiteReviewsApi = {
  list: (params?: { page?: number; limit?: number; sortBy?: ReviewSort; rating?: number }) =>
    apiClient.get<{
      success: boolean;
      data: IWebsiteReview[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/website-reviews', { params }),

  getSummary: () => apiClient.get<{ success: boolean; data: IReviewSummary }>('/website-reviews/summary'),

  getMine: () => apiClient.get<{ success: boolean; data: IWebsiteReview | null }>('/website-reviews/me'),

  create: (payload: { rating: number; title?: string; content: string }) =>
    apiClient.post<{ success: boolean; data: IWebsiteReview }>('/website-reviews', payload),

  update: (id: string, payload: { rating?: number; title?: string; content?: string }) =>
    apiClient.patch<{ success: boolean; data: IWebsiteReview }>(`/website-reviews/${id}`, payload),

  delete: (id: string) => apiClient.delete<{ success: boolean; message: string }>(`/website-reviews/${id}`),

  voteHelpful: (id: string) =>
    apiClient.post<{ success: boolean; data: { reviewId: string; helpfulCount: number; voted: boolean } }>(
      `/website-reviews/${id}/helpful`,
      { action: 'TOGGLE' }
    ),

  listAdmin: (params?: { page?: number; limit?: number; status?: 'PUBLISHED' | 'HIDDEN'; search?: string }) =>
    apiClient.get<{
      success: boolean;
      data: IWebsiteReview[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/website-reviews/admin/list', { params }),

  moderate: (id: string, payload: { action: 'HIDE' | 'RESTORE'; reason?: string }) =>
    apiClient.patch<{ success: boolean; data: IWebsiteReview }>(`/website-reviews/${id}/moderate`, payload),

  deleteByAdmin: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/website-reviews/${id}/admin`),
};
