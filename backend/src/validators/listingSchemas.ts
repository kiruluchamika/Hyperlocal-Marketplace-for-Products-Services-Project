import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Flexible image URL schema
const imageUrlSchema = z.string().url("Images must be valid URLs").or(z.string().min(5));

// Flexible attributes - string, number, or boolean
const attributeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean()
]);

// Location schema with flexible coordinates
const locationSchema = z.object({
  city: z.string().min(1, "City is required").max(50),
  address: z.string().max(255).optional(),
  district: z.string().max(50).optional(),
  province: z.string().max(50).optional(),
  coordinates: z.any().optional() // Allows both {lat,lng} and [lng,lat]
});

/**
 * Schema for creating a product listing
 * Flexible but validates essential fields
 */
export const createListingSchema = z.object({
  type: z.literal("PRODUCT").default("PRODUCT").optional(),
  
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),
  
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(3000, "Description cannot exceed 3000 characters"),
  
  categoryId: z.string()
    .min(1, "Category ID is required")
    .regex(objectIdRegex, "Invalid category ID format"),
  
  price: z.number()
    .positive("Price must be a positive number"),
  
  currency: z.string()
    .default("LKR")
    .optional(),
  
  transactionMode: z.enum(["BUY_NOW", "NEGOTIABLE"])
    .default("BUY_NOW"),
  
  condition: z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"])
    .default("USED_GOOD")
    .optional(),
  
  // Flexible attributes matching category
  attributes: z.record(
    z.string(),
    attributeValueSchema
  ).optional(),
  
  // Optional images
  images: z.array(imageUrlSchema)
    .optional()
    .default([]),
  
  // Location with flexible coordinates
  location: locationSchema,
  
  // Optional tags
  tags: z.array(z.string().min(1))
    .max(20)
    .optional(),
  
  isNegotiable: z.boolean().optional(),
});

/**
 * Schema for updating a product listing
 */
export const updateListingSchema = z
  .object({
    transactionMode: z.enum(["BUY_NOW", "NEGOTIABLE"]).optional(),
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(10).max(3000).optional(),
    categoryId: z.string().min(1).optional(),
    attributes: z.record(z.string(), attributeValueSchema).optional(),
    price: z.number().min(0).optional(),
    currency: z.string().optional(),
    condition: z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]).optional(),
    images: z.array(imageUrlSchema).optional(),
    location: locationSchema.optional(),
    tags: z.array(z.string().min(1)).max(20).optional(),
    status: z.enum(["ACTIVE", "SOLD", "HIDDEN"]).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required for update"
  });

export const listingIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, "Invalid listing id")
});

export const listListingsQuerySchema = z
  .object({
    search: z.string().min(1).optional(),
    categoryId: z.string().optional(),
    transactionMode: z.enum(["BUY_NOW", "NEGOTIABLE"]).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    condition: z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
  .refine(
    (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice"
    }
  );
