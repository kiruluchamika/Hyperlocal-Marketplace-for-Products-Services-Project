import apiClient from './client';
import { IOrder } from '@/types';

export const ordersApi = {
  create: (data: {
    listingId: string;
    quantity: number;
    deliveryMethod: string;
    deliveryAddress?: string;
    note?: string;
  }) =>
    apiClient.post<{ order: IOrder }>('/orders', data),

  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ orders: IOrder[]; pagination: { total: number; page: number; totalPages: number } }>('/orders', { params }),

  getById: (id: string) =>
    apiClient.get<{ order: IOrder; allowedActions: string[] }>(`/orders/${id}`),

  cancel: (id: string) =>
    apiClient.patch<{ order: IOrder }>(`/orders/${id}/cancel`),

  confirmReceived: (id: string) =>
    apiClient.patch<{ order: IOrder }>(`/orders/${id}/confirm-received`),

  confirmReceivedWithOtp: (id: string, otp: string) =>
    apiClient.post<{ order: IOrder }>(`/orders/${id}/confirm-received-otp`, { otp }),

  updateDeliveryDetails: (id: string, data: { deliveryMethod: string; deliveryAddress?: string }) =>
    apiClient.put<{ order: IOrder }>(`/orders/${id}/delivery-details`, data),

  accept: (id: string) =>
    apiClient.patch<{ order: IOrder }>(`/orders/${id}/accept`),

  reject: (id: string) =>
    apiClient.patch<{ order: IOrder }>(`/orders/${id}/reject`),

  start: (id: string) =>
    apiClient.patch<{ order: IOrder }>(`/orders/${id}/start`),

  confirmDelivery: (id: string, otp: string) =>
    apiClient.post<{ order: IOrder }>(`/orders/${id}/confirm-delivery`, { otp }),
};
