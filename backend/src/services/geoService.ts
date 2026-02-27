/**
 * Geospatial Service
 * 
 * Handles geospatial queries for nearby products and services
 * Uses MongoDB 2dsphere indexes for efficient distance-based searches
 * Searches both ProductListings and ServiceListings within specified radius
 */

import ProductListing from "../models/ProductListing";
import ServiceListing from "../models/ServiceListing";
import { AppError } from "../utils/AppError";

interface NearbySearchResult {
  id: string;
  type: "PRODUCT" | "SERVICE";
  title: string;
  description?: string;
  price: number;
  pricingType?: string;
  city: string;
  distance: number; // in kilometers
  sellerId: string;
  categoryId: string;
  location?: {
    text?: string;
    coordinates?: [number, number];
  };
  status?: string;
  condition?: string;
  images?: string[];
  isActive?: boolean;
}

interface NearbySearchResponse {
  success: boolean;
  data: {
    products: NearbySearchResult[];
    services: NearbySearchResult[];
  };
  total: number;
  query: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  timestamp: Date;
}

/**
 * Convert kilometers to radians for MongoDB geospatial queries
 * MongoDB 2dsphere uses radians for distance calculations
 * Earth radius: 6371 km
 */
const kmToRadians = (km: number): number => {
  const earthRadiusKm = 6371;
  return km / earthRadiusKm;
};

/**
 * Calculate distance in kilometers between two coordinates using Haversine formula
 * Used for sorting and distance display
 */
const calculateDistance = (
  centerLat: number,
  centerLng: number,
  itemLat: number,
  itemLng: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((itemLat - centerLat) * Math.PI) / 180;
  const dLng = ((itemLng - centerLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((centerLat * Math.PI) / 180) *
      Math.cos((itemLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Round to 2 decimal places
};

/**
 * Search for nearby product listings within specified radius
 */
const searchNearbyProducts = async (
  latitude: number,
  longitude: number,
  radiusKm: number
) => {
  const radiusInRadians = kmToRadians(radiusKm);

  const products = await ProductListing.find(
    {
      "location.coordinates": {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRadians]
        }
      },
      status: "ACTIVE"
    },
    {
      _id: 1,
      title: 1,
      description: 1,
      price: 1,
      city: 1,
      "location.coordinates": 1,
      condition: 1,
      images: 1,
      ownerId: 1,
      categoryId: 1,
      status: 1
    }
  ).lean();

  return products.map((product: any) => ({
    id: product._id.toString(),
    type: "PRODUCT" as const,
    title: product.title,
    description: product.description,
    price: product.price,
    city: product.city,
    distance: calculateDistance(
      latitude,
      longitude,
      product.location.coordinates.coordinates[1],
      product.location.coordinates.coordinates[0]
    ),
    sellerId: product.ownerId.toString(),
    categoryId: product.categoryId.toString(),
    condition: product.condition,
    images: product.images,
    status: product.status,
    location: {
      coordinates: [
        product.location.coordinates.coordinates[1],
        product.location.coordinates.coordinates[0]
      ] as [number, number]
    }
  } as NearbySearchResult));
};

/**
 * Search for nearby service listings within specified radius
 */
const searchNearbyServices = async (
  latitude: number,
  longitude: number,
  radiusKm: number
) => {
  const radiusInRadians = kmToRadians(radiusKm);

  const services = await ServiceListing.find(
    {
      "location.coordinates": {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRadians]
        }
      },
      isActive: true
    },
    {
      _id: 1,
      title: 1,
      description: 1,
      price: 1,
      pricingType: 1,
      locationText: 1,
      "location.coordinates": 1,
      sellerId: 1,
      categoryId: 1,
      isActive: 1
    }
  ).lean();

  return services.map((service: any) => ({
    id: service._id.toString(),
    type: "SERVICE" as const,
    title: service.title,
    description: service.description,
    price: service.price,
    pricingType: service.pricingType,
    city: service.locationText || "Unknown",
    distance: service.location?.coordinates
      ? calculateDistance(
          latitude,
          longitude,
          service.location.coordinates.coordinates[1],
          service.location.coordinates.coordinates[0]
        )
      : 0,
    sellerId: service.sellerId.toString(),
    categoryId: service.categoryId.toString(),
    isActive: service.isActive,
    location: {
      text: service.locationText,
      coordinates: service.location?.coordinates
        ? ([
            service.location.coordinates.coordinates[1],
            service.location.coordinates.coordinates[0]
          ] as [number, number])
        : undefined
    }
  } as NearbySearchResult));
};

/**
 * Search for products and services within specified radius from coordinates
 * Returns combined results sorted by distance
 */
export const searchNearby = async (
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<NearbySearchResponse> => {
  // Input validation
  if (latitude < -90 || latitude > 90) {
    throw new AppError(
      "Invalid latitude. Must be between -90 and 90",
      400
    );
  }

  if (longitude < -180 || longitude > 180) {
    throw new AppError(
      "Invalid longitude. Must be between -180 and 180",
      400
    );
  }

  if (radiusKm <= 0 || radiusKm > 100) {
    throw new AppError(
      "Invalid radius. Must be between 0 and 100 kilometers",
      400
    );
  }

  try {
    // Execute both searches in parallel
    const [products, services] = await Promise.all([
      searchNearbyProducts(latitude, longitude, radiusKm),
      searchNearbyServices(latitude, longitude, radiusKm)
    ]);

    // Sort by distance
    products.sort((a, b) => a.distance - b.distance);
    services.sort((a, b) => a.distance - b.distance);

    return {
      success: true,
      data: {
        products,
        services
      },
      total: products.length + services.length,
      query: {
        latitude,
        longitude,
        radiusKm
      },
      timestamp: new Date()
    };
  } catch (error) {
    // Re-throw MongoDB geospatial-specific errors
    if (error instanceof AppError) {
      throw error;
    }

    // Handle MongoDB errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("coordinates")) {
      throw new AppError(
        "Error processing geospatial coordinates. Ensure coordinates are valid [lng, lat].",
        400
      );
    }

    // Re-throw other MongoDB errors
    throw new AppError("Error during geospatial search", 500);
  }
};

/**
 * Search nearby with additional filter options
 */
export const searchNearbyWithFilters = async (
  latitude: number,
  longitude: number,
  radiusKm: number,
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    type?: "PRODUCT" | "SERVICE";
    categoryId?: string;
  }
) => {
  const result = await searchNearby(latitude, longitude, radiusKm);

  let { products, services } = result.data;

  // Apply filters
  if (filters?.minPrice) {
    products = products.filter((p) => p.price >= filters.minPrice!);
    services = services.filter((s) => s.price >= filters.minPrice!);
  }

  if (filters?.maxPrice) {
    products = products.filter((p) => p.price <= filters.maxPrice!);
    services = services.filter((s) => s.price <= filters.maxPrice!);
  }

  if (filters?.type === "PRODUCT") {
    services = [];
  } else if (filters?.type === "SERVICE") {
    products = [];
  }

  if (filters?.categoryId) {
    products = products.filter((p) => p.categoryId === filters.categoryId);
    services = services.filter((s) => s.categoryId === filters.categoryId);
  }

  return {
    ...result,
    data: {
      products,
      services
    },
    total: products.length + services.length
  };
};
