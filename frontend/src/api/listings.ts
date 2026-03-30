import apiClient from './client';
import { IProductListing, ListingFilters, ListingResponse, ListingsResponse } from '@/types';

export const listingsApi = {
  getAll: (params?: ListingFilters) =>
    apiClient.get<ListingsResponse>('/listings', { params }),

  getById: (id: string) =>
    apiClient.get<ListingResponse>(`/listings/${id}`),

  getMyActive: async () => {
    return apiClient.get<ListingsResponse>('/listings/me');
  },

  create: (data: Partial<IProductListing>) =>
    apiClient.post<ListingResponse>('/listings', data),

  update: (id: string, data: Partial<IProductListing>) =>
    apiClient.put<ListingResponse>(`/listings/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/listings/${id}`),
};
