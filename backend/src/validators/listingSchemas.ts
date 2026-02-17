import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const coordinatesSchema = z
  .array(z.number())
  .length(2, "coordinates must be [lng, lat]")
  .refine((coords) => coords[0] >= -180 && coords[0] <= 180, {
    message: "longitude out of range"
  })
  .refine((coords) => coords[1] >= -90 && coords[1] <= 90, {
    message: "latitude out of range"
  });

const imageUrlSchema = z.string().url("images must contain valid URLs");

export const createListingSchema = z.object({
  type: z.literal("PRODUCT").default("PRODUCT"),
  transactionMode: z.enum(["BUY_NOW", "NEGOTIABLE"]).default("BUY_NOW"),
  title: z.string().min(3, "title is required").max(120),
  description: z.string().min(10, "description is required").max(3000),
  categoryId: z.string().min(1, "categoryId is required"),
  price: z.number().min(0),
  currency: z.string().min(3).max(3).default("LKR"),
  isNegotiable: z.boolean().optional().default(false),
  condition: z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]),
  images: z.array(imageUrlSchema).min(1).max(10),
  location: z.object({
    city: z.string().min(1, "city is required"),
    address: z.string().optional(),
    coordinates: coordinatesSchema
  }),
  tags: z.array(z.string().min(1)).max(20).optional()
});

export const updateListingSchema = z
  .object({
    transactionMode: z.enum(["BUY_NOW", "NEGOTIABLE"]).optional(),
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(10).max(3000).optional(),
    categoryId: z.string().min(1).optional(),
    price: z.number().min(0).optional(),
    currency: z.string().min(3).max(3).optional(),
    isNegotiable: z.boolean().optional(),
    condition: z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]).optional(),
    images: z.array(imageUrlSchema).min(1).max(10).optional(),
    location: z
      .object({
        city: z.string().min(1).optional(),
        address: z.string().optional(),
        coordinates: coordinatesSchema.optional()
      })
      .optional(),
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
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    condition: z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0.1).max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    sort: z.enum(["recent", "priceAsc", "priceDesc"]).default("recent")
  })
  .refine(
    (query) =>
      (query.lat === undefined && query.lng === undefined && query.radiusKm === undefined) ||
      (query.lat !== undefined && query.lng !== undefined),
    {
      message: "lat and lng are required for radius filtering"
    }
  )
  .refine(
    (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice"
    }
  );
