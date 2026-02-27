import apiClient from './client';
import { IProductListing, ListingFilters } from '@/types';

export const listingsApi = {
  getAll: (params?: ListingFilters) =>
    apiClient.get<{ listings: IProductListing[]; pagination: { total: number; page: number; totalPages: number } }>('/listings', { params }),

  getById: (id: string) =>
    apiClient.get<{ listing: IProductListing }>(`/listings/${id}`),

  create: (data: Partial<IProductListing>) =>
    apiClient.post<{ listing: IProductListing }>('/listings', data),

  update: (id: string, data: Partial<IProductListing>) =>
    apiClient.put<{ listing: IProductListing }>(`/listings/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/listings/${id}`),
};
