import { z } from "zod";

export const createServiceBookingSchema = z.object({
  serviceId: z.string().min(1),
  startAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(24 * 60),
  note: z.string().max(1000).optional(),
});

export const bookingIdParamSchema = z.object({
  id: z.string().min(1),
});

export const providerDecisionSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
});

export const slotsQuerySchema = z.object({
  serviceId: z.string().min(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ✅ NEW: Provider bookings filter (?status=CONFIRMED etc.)
export const providerBookingsQuerySchema = z.object({
  status: z.enum(["PENDING", "PROVIDER_ACCEPTED", "CONFIRMED", "REJECTED", "CANCELLED"]).optional(),
});

// (Optional) buyer filter too if you later want it
export const buyerBookingsQuerySchema = z.object({
  status: z.enum(["PENDING", "PROVIDER_ACCEPTED", "CONFIRMED", "REJECTED", "CANCELLED"]).optional(),
});