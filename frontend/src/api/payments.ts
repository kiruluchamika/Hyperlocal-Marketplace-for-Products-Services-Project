import apiClient from './client';
import { IPayment } from '@/types';

export const paymentsApi = {
  getConfig: () =>
    apiClient.get<{ success: boolean; data: { publishableKey: string } }>('/payments/config'),

  initiate: (orderId: string) =>
    apiClient.post<{ clientSecret: string; payment: IPayment }>('/payments/initiate', { orderId }),

  getByOrderId: (orderId: string) =>
    apiClient.get<{ payment: IPayment }>(`/payments/order/${orderId}`),

  getById: (id: string) =>
    apiClient.get<{ payment: IPayment }>(`/payments/${id}`),
};
