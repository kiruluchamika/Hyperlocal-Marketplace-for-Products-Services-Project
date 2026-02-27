/**
 * Geospatial Validation Schemas
 * 
 * Zod schemas for validating geospatial search inputs
 */

import { z } from "zod";

/**
 * Schema for nearby search query parameters
 * Validates latitude, longitude, and radius
 */
export const nearbySearchQuerySchema = z.object({
  latitude: z
    .string()
    .or(z.number())
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error("Latitude must be a valid number");
      return num;
    })
    .refine((lat) => lat >= -90 && lat <= 90, {
      message: "Latitude must be between -90 and 90 degrees"
    }),

  longitude: z
    .string()
    .or(z.number())
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error("Longitude must be a valid number");
      return num;
    })
    .refine((lng) => lng >= -180 && lng <= 180, {
      message: "Longitude must be between -180 and 180 degrees"
    }),

  radiusKm: z
    .string()
    .or(z.number())
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error("Radius must be a valid number");
      return num;
    })
    .refine((radius) => radius > 0 && radius <= 100, {
      message: "Radius must be between 0 (exclusive) and 100 kilometers"
    })
});

/**
 * Schema for nearby search with optional filters
 */
export const nearbySearchWithFiltersSchema = nearbySearchQuerySchema.extend({
  minPrice: z
    .string()
    .or(z.number())
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error("minPrice must be a valid number");
      return num;
    })
    .refine((price) => !price || price >= 0, {
      message: "Minimum price must be non-negative"
    }),

  maxPrice: z
    .string()
    .or(z.number())
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error("maxPrice must be a valid number");
      return num;
    })
    .refine((price) => !price || price >= 0, {
      message: "Maximum price must be non-negative"
    }),

  type: z
    .enum(["PRODUCT", "SERVICE"])
    .optional(),

  categoryId: z
    .string()
    .optional()
    .refine((id) => !id || /^[0-9a-fA-F]{24}$/.test(id), {
      message: "Invalid category ID format"
    })
});

/**
 * Body schema for nearby search (alternative to query params)
 */
export const nearbySearchBodySchema = z.object({
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),

  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),

  radiusKm: z
    .number()
    .min(0.1, "Radius must be greater than 0")
    .max(100, "Radius cannot exceed 100 kilometers"),

  filters: z
    .object({
      minPrice: z.number().min(0).optional(),
      maxPrice: z.number().min(0).optional(),
      type: z.enum(["PRODUCT", "SERVICE"]).optional(),
      categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID").optional()
    })
    .optional()
});

/**
 * ✅ ENHANCED GEO VALIDATION SCHEMAS
 */

/**
 * Advanced geo search with comprehensive filtering
 */
export const advancedGeoSearchSchema = nearbySearchWithFiltersSchema.extend({
  condition: z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]).optional(),
  sellerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid seller ID").optional(),
  search: z.string().max(100, "Search query too long").optional(),
  sortBy: z.enum(["distance", "-distance", "price", "-price", "date", "-date"]).default("distance"),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  tags: z.array(z.string()).optional(),
  inStock: z.boolean().optional()
}).refine(
  (data) => {
    if (data.minPrice && data.maxPrice) {
      return data.minPrice <= data.maxPrice;
    }
    return true;
  },
  {
    message: "Minimum price cannot be greater than maximum price",
    path: ["minPrice"]
  }
);

/**
 * Validation for coordinate bounding box search
 */
export const geoGeofenceSearchSchema = z.object({
  swLat: z
    .string()
    .or(z.number())
    .transform((val) => typeof val === "string" ? parseFloat(val) : val)
    .refine((lat) => lat >= -90 && lat <= 90, "Invalid southwest latitude"),

  swLng: z
    .string()
    .or(z.number())
    .transform((val) => typeof val === "string" ? parseFloat(val) : val)
    .refine((lng) => lng >= -180 && lng <= 180, "Invalid southwest longitude"),

  neLat: z
    .string()
    .or(z.number())
    .transform((val) => typeof val === "string" ? parseFloat(val) : val)
    .refine((lat) => lat >= -90 && lat <= 90, "Invalid northeast latitude"),

  neLng: z
    .string()
    .or(z.number())
    .transform((val) => typeof val === "string" ? parseFloat(val) : val)
    .refine((lng) => lng >= -180 && lng <= 180, "Invalid northeast longitude"),

  type: z.enum(["PRODUCT", "SERVICE"]).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
}).refine(
  (data) => data.swLat <= data.neLat,
  { message: "Southwest latitude must be less than northeast latitude", path: ["swLat"] }
).refine(
  (data) => data.swLng <= data.neLng,
  { message: "Southwest longitude must be less than northeast longitude", path: ["swLng"] }
);

/**
 * Validation for bulk/batch geo searches
 */
export const batchGeoSearchSchema = z.object({
  searches: z.array(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusKm: z.number().min(0.1).max(100)
    })
  ).min(1, "At least 1 search required").max(10, "Maximum 10 searches per batch")
});

/**
 * Validation for geo search with delivery options
 */
export const geoSearchWithDeliverySchema = nearbySearchWithFiltersSchema.extend({
  deliveryType: z.enum(["PICKUP", "DELIVERY", "BOTH"]).optional(),
  maxDeliveryDistance: z.number().min(0).max(100).optional(),
  availableNow: z.boolean().optional()
});

/**
 * Validation for favorite locations save
 */
export const saveFavoriteLocationSchema = z.object({
  name: z.string().min(2, "Location name must be at least 2 characters").max(50),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  description: z.string().max(200).optional(),
  icon: z.string().emoji("Invalid emoji").optional()
});

/**
 * Validation for coordinate validation utility
 */
export const validateCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
}).refine(
  (data) => !(data.latitude === 0 && data.longitude === 0),
  { message: "Null Island (0,0) is not a valid location" }
);

/**
 * Validation for seller location radius settings
 */
export const sellerDeliveryRadiusSchema = z.object({
  sellerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid seller ID"),
  maxDeliveryRadius: z.number().min(1).max(100, "Maximum delivery radius is 100km"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDeliveryAvailable: z.boolean().default(true)
});

/**
 * Validation for location-based recommendations
 */
export const locationRecommendationsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.1).max(50).default(10),
  type: z.enum(["NEARBY", "TRENDING", "POPULAR", "NEW"]).default("NEARBY"),
  limit: z.number().int().min(1).max(50).default(10),
  excludeSellerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional()
});
