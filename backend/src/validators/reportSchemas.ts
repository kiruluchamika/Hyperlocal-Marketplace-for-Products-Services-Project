import { z } from "zod";

export const submitReportSchema = z.object({
  body: z.object({
    targetType: z.enum(["LISTING", "SERVICE", "USER"]),
    targetId: z.string().min(1, "Target ID is required"),
    reason: z.enum(["SPAM", "FRAUD", "INAPPROPRIATE_CONTENT", "HARASSMENT", "DUPLICATE", "OTHER"]),
    description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must not exceed 1000 characters"),
  }),
});

export const resolveReportSchema = z.object({
  body: z.object({
    status: z.enum(["RESOLVED", "REJECTED"]),
    adminNotes: z.string().max(1000, "Admin notes must not exceed 1000 characters").optional(),
    actionTaken: z.enum(["SUSPENDED", "WARNING_SENT", "NONE"]).optional(),
  }),
});

export const listReportsSchema = z.object({
  query: z.object({
    status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"]).optional(),
    targetType: z.enum(["LISTING", "SERVICE", "USER"]).optional(),
    reason: z.string().optional(),
    page: z.string().default("1").transform(Number),
    limit: z.string().default("20").transform(Number),
  }),
});
