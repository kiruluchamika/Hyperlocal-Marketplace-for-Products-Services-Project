import apiClient from './client';
import { CategoryAttribute, CategoryType, ICategory } from '@/types';

interface CategoryListParams {
  type?: CategoryType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface CategoryPagination {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface CategoryListResponse {
  data: ICategory[];
  pagination: CategoryPagination;
}

interface CategoryPayload {
  name: string;
  type: CategoryType;
  description?: string;
  attributes?: CategoryAttribute[];
  isActive?: boolean;
}

export const categoriesApi = {
  getAll: (params?: CategoryListParams) =>
    apiClient.get<CategoryListResponse>('/categories', { params }),

  getById: (id: string) =>
    apiClient.get<ICategory>(`/categories/${id}`),

  create: (data: CategoryPayload) =>
    apiClient.post<ICategory>('/categories', data),

  update: (id: string, data: Partial<CategoryPayload>) =>
    apiClient.put<ICategory>(`/categories/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ message: string }>(`/categories/${id}`),
};
