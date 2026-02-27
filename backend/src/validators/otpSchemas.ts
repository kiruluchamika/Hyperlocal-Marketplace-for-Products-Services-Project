import { z } from "zod";

const phoneRegex = /^\+[1-9]\d{7,14}$/;

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, "Phone must be in E.164 format (e.g. +94771234567)"),
  channel: z.enum(["sms", "whatsapp"]).default("sms")
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, "Phone must be in E.164 format (e.g. +94771234567)"),
  code: z
    .string()
    .min(4, "OTP code is too short")
    .max(10, "OTP code is too long")
    .regex(/^\d+$/, "OTP code must contain only digits")
});
