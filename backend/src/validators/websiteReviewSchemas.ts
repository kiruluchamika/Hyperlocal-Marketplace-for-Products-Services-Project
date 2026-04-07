import { z } from "zod";

export const createWebsiteReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  content: z.string().min(10).max(2000),
});

export const updateWebsiteReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(120).optional(),
  content: z.string().min(10).max(2000).optional(),
});

export const websiteReviewIdParamSchema = z.object({
  id: z.string().min(1),
});

export const websiteReviewListQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  sortBy: z.enum(["latest", "oldest", "ratingHigh", "ratingLow", "helpful"]).optional().default("latest"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const adminWebsiteReviewListQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  status: z.enum(["PUBLISHED", "HIDDEN"]).optional(),
  search: z.string().optional(),
});

export const moderateWebsiteReviewSchema = z.object({
  action: z.enum(["HIDE", "RESTORE"]),
  reason: z.string().max(500).optional(),
});

export const helpfulWebsiteVoteSchema = z.object({
  action: z.enum(["TOGGLE"]).optional().default("TOGGLE"),
});
