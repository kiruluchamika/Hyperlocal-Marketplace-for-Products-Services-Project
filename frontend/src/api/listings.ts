import apiClient from './client';
import { IProductListing, ListingFilters, ListingResponse, ListingsResponse } from '@/types';

export const listingsApi = {
  getAll: (params?: ListingFilters) =>
    apiClient.get<ListingsResponse>('/listings', { params }),

  getById: (id: string) =>
    apiClient.get<ListingResponse>(`/listings/${id}`),

  getMyActive: async (ownerId: string) => {
    const { data } = await apiClient.get<ListingsResponse>('/listings', {
      params: { page: 1, limit: 100 },
    });

    const mine = data.data.filter((listing) => {
      if (typeof listing.ownerId === 'string') {
        return listing.ownerId === ownerId;
      }

      const owner = listing.ownerId as IProductListing['ownerId'] & {
        _id?: string;
        id?: string;
      };

      return owner?._id === ownerId || owner?.id === ownerId;
    });

    return {
      ...data,
      data: mine,
      pagination: {
        ...data.pagination,
        total: mine.length,
        totalPages: 1,
        page: 1,
      },
    };
  },

  create: (data: Partial<IProductListing>) =>
    apiClient.post<ListingResponse>('/listings', data),

  update: (id: string, data: Partial<IProductListing>) =>
    apiClient.put<ListingResponse>(`/listings/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/listings/${id}`),
};
