export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export interface GeoSearchResult {
  type: 'PRODUCT' | 'SERVICE';
  item: Record<string, unknown>;
  distance: number;
}

export interface ListingFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  transactionMode?: string;
  city?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface ServiceFilters {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}
