import apiClient from './client';
import { ICategory } from '@/types';

export const categoriesApi = {
  getAll: (params?: { type?: string; isActive?: boolean; search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ categories: ICategory[]; pagination?: { total: number; page: number; totalPages: number } }>('/categories', { params }),

  getById: (id: string) =>
    apiClient.get<{ category: ICategory }>(`/categories/${id}`),

  create: (data: Partial<ICategory>) =>
    apiClient.post<{ category: ICategory }>('/categories', data),

  update: (id: string, data: Partial<ICategory>) =>
    apiClient.put<{ category: ICategory }>(`/categories/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/categories/${id}`),
};
