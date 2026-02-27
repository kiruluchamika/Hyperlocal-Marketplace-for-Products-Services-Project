import apiClient from './client';
import { IServiceSelling, IServiceBooking } from '@/types';

export const servicesApi = {
  getAll: (params?: { category?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ services: IServiceSelling[]; pagination: { total: number; page: number; totalPages: number } }>('/serviceselling', { params }),

  getMyServices: () =>
    apiClient.get<{ services: IServiceSelling[] }>('/serviceselling/me'),

  getById: (id: string) =>
    apiClient.get<{ service: IServiceSelling }>(`/serviceselling/${id}`),

  create: (data: Partial<IServiceSelling>) =>
    apiClient.post<{ service: IServiceSelling }>('/serviceselling', data),

  update: (id: string, data: Partial<IServiceSelling>) =>
    apiClient.put<{ service: IServiceSelling }>(`/serviceselling/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/serviceselling/${id}`),

  moderate: (id: string, reason: string) =>
    apiClient.patch(`/serviceselling/${id}/moderate`, { reason }),

  // Admin
  getAllAdmin: (params?: Record<string, unknown>) =>
    apiClient.get<{ services: IServiceSelling[] }>('/serviceselling/admin', { params }),
};

export const bookingsApi = {
  create: (data: { serviceId: string; startAt: string; endAt: string; durationMinutes: number; note?: string }) =>
    apiClient.post<{ booking: IServiceBooking }>('/servicebookings', data),

  getMyBookings: (params?: { status?: string }) =>
    apiClient.get<{ bookings: IServiceBooking[] }>('/servicebookings/me', { params }),

  getProviderBookings: (params?: { status?: string }) =>
    apiClient.get<{ bookings: IServiceBooking[] }>('/servicebookings/provider/me', { params }),

  getSlots: (serviceId: string) =>
    apiClient.get<{ slots: { startAt: string; endAt: string }[] }>('/servicebookings/slots', { params: { serviceId } }),

  cancel: (id: string) =>
    apiClient.patch(`/servicebookings/${id}/cancel`),

  decision: (id: string, decision: 'ACCEPT' | 'REJECT') =>
    apiClient.patch(`/servicebookings/${id}/decision`, { decision }),

  initiateDeposit: (id: string) =>
    apiClient.post<{ clientSecret: string }>(`/servicebookings/${id}/deposit/initiate`),
};
