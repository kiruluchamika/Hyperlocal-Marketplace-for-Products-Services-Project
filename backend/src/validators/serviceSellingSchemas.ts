import { z } from "zod";

export const createServiceSellingSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),

  categoryId: z.string().min(1),

  price: z.number().min(0),
  pricingType: z.enum(["FIXED", "HOURLY"]),

  locationText: z.string().min(2).max(120),

  images: z.array(z.string().url()).optional().default([]),

  attributeValues: z.record(z.unknown()).optional().default({}),
});

export const updateServiceSellingSchema =
  createServiceSellingSchema.partial();

export const listServiceSellingQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  pricingType: z.enum(["FIXED", "HOURLY"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});
