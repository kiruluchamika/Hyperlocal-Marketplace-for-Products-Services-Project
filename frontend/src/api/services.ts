import apiClient from './client';
import { IServiceBooking, IServiceBookingSlot, IServiceSelling } from '@/types';

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
    apiClient.post<{ success: boolean; data: { clientSecret: string } }>(`/servicebookings/${id}/deposit/initiate`),
};
