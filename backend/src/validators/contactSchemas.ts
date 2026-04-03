import { z } from "zod";
import { ContactMessageStatus } from "../models/ContactMessage";

const phoneRegex = /^\+?[0-9\s\-()]{7,30}$/;

export const createContactSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(120).optional(),
    email: z.string().trim().email("Valid email required").max(200).optional(),
    phone: z.string().trim().regex(phoneRegex, "Invalid phone number format").optional(),
    whatsappNumber: z.string().trim().regex(phoneRegex, "Invalid WhatsApp number format").optional(),
    subject: z.string().trim().min(3, "Subject is required").max(200),
    message: z.string().trim().min(10, "Message is too short").max(5000)
  });

export const listContactAdminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(ContactMessageStatus).optional(),
  search: z.string().trim().max(120).optional()
});

export const listMyContactQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const markReviewedSchema = z.object({
  status: z.literal(ContactMessageStatus.REVIEWED_NO_REPLY).optional()
});

export const replyContactSchema = z.object({
  replyMessage: z.string().trim().min(5, "Reply is too short").max(5000)
});
