import { z } from "zod";

export const createReviewSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  bookingId: z.string().min(1, "Booking ID is required"),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  content: z.string().min(10).max(2000),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(120).optional(),
  content: z.string().min(10).max(2000).optional(),
});

export const reviewIdParamSchema = z.object({
  id: z.string().min(1),
});

export const serviceReviewListQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  sortBy: z.enum(["latest", "oldest", "ratingHigh", "ratingLow", "helpful"]).optional().default("latest"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const adminReviewListQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  status: z.enum(["PUBLISHED", "HIDDEN"]).optional(),
  serviceId: z.string().optional(),
  search: z.string().optional(),
});

export const sellerReplySchema = z.object({
  content: z.string().min(3).max(1000),
});

export const moderateReviewSchema = z.object({
  action: z.enum(["HIDE", "RESTORE"]),
  reason: z.string().max(500).optional(),
});

export const helpfulVoteSchema = z.object({
  action: z.enum(["TOGGLE"]).optional().default("TOGGLE"),
});
