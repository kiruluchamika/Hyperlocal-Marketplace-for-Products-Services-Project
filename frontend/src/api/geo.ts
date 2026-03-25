import apiClient from './client';
import { GeoSearchFilterParams, GeoSearchResponse, GeoSearchParams } from '@/types';

export const geoApi = {
  search: (params: GeoSearchParams) =>
    apiClient.get<GeoSearchResponse>('/geo-search/search', { params }),

  searchWithFilters: (params: GeoSearchFilterParams) =>
    apiClient.get<GeoSearchResponse>('/geo-search/search-with-filters', { params }),
};
