import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("5000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  
  // Stripe Configuration
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1, "STRIPE_PUBLISHABLE_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  
  // Order & Payment Settings
  ENABLE_OTP_DELIVERY: z.string().default("true"),
  OTP_EXPIRY_MINUTES: z.string().default("30"),
  CURRENCY: z.string().default("LKR")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
