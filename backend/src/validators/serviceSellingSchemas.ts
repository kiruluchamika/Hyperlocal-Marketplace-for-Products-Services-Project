import { z } from "zod";

export const createServiceSellingSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(2000).optional().default(""),

  categoryId: z.string().min(1),

  price: z.number().min(0),
  pricingType: z.enum(["FIXED", "HOURLY"]),

  locationText: z.string().min(2).max(120),

  location: z.object({
    city: z.string().min(2).max(120),
    address: z.string().min(2).max(200).optional(),
    coordinates: z
      .object({
        type: z.literal("Point").default("Point"),
        coordinates: z
          .tuple([z.number(), z.number()])
          .refine(
            ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
            { message: "Invalid coordinates. Use [lng, lat]." }
          ),
      })
      .optional(),
  }),

  images: z.array(z.string().url()).optional().default([]),

  attributeValues: z.record(z.unknown()).optional().default({}),
});

export const updateServiceSellingSchema = createServiceSellingSchema.partial();

export const listServiceSellingQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  pricingType: z.enum(["FIXED", "HOURLY"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});
