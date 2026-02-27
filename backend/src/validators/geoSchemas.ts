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
