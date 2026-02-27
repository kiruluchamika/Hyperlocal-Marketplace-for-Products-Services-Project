import apiClient from './client';

export const geoApi = {
  search: (params: { lat: number; lng: number; radius?: number }) =>
    apiClient.get('/geo-search/search', { params }),

  searchWithFilters: (params: {
    lat: number;
    lng: number;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
    type?: string;
    category?: string;
  }) =>
    apiClient.get('/geo-search/search-with-filters', { params }),
};
