export type GeoItemType = 'PRODUCT' | 'SERVICE';

export interface GeoLocationPoint {
  coordinates?: [number, number]; // [lat, lng]
  text?: string;
}

export interface GeoNearbyItem {
  id: string;
  type: GeoItemType;
  title: string;
  description?: string;
  price: number;
  pricingType?: string;
  city: string;
  distance: number;
  sellerId: string;
  categoryId: string;
  location?: GeoLocationPoint;
  status?: string;
  condition?: string;
  images?: string[];
  isActive?: boolean;
}

export interface GeoSearchData {
  products: GeoNearbyItem[];
  services: GeoNearbyItem[];
}

export interface GeoSearchResponse {
  success: boolean;
  data: GeoSearchData;
  total: number;
  query: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  timestamp: string;
}

export interface GeoSearchParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export interface GeoSearchFilterParams extends GeoSearchParams {
  minPrice?: number;
  maxPrice?: number;
  type?: GeoItemType;
  categoryId?: string;
}
