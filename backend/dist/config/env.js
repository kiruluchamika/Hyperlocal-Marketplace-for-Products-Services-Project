"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default("5000"),
    MONGODB_URI: zod_1.z.string().min(1, "MONGODB_URI is required"),
    MONGODB_FALLBACK_URI: zod_1.z.string().min(1).optional(),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(10000),
    JWT_SECRET: zod_1.z.string().min(1, "JWT_SECRET is required"),
    JWT_EXPIRES_IN: zod_1.z.string().default("7d"),
    // Stripe Configuration
    STRIPE_SECRET_KEY: zod_1.z.string().min(1, "STRIPE_SECRET_KEY is required"),
    STRIPE_PUBLISHABLE_KEY: zod_1.z.string().min(1, "STRIPE_PUBLISHABLE_KEY is required"),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
    // Order & Payment Settings
    ENABLE_OTP_DELIVERY: zod_1.z.string().default("true"),
    OTP_EXPIRY_MINUTES: zod_1.z.string().default("30"),
    CURRENCY: zod_1.z.string().default("LKR")
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
}
exports.env = parsed.data;
