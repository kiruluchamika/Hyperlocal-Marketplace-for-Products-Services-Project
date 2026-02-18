"use strict";
/**
 * Payment Validators
 *
 * Zod schemas for validating payment-related requests.
 * Used for payment initiation and webhook processing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentByIdSchema = exports.getPaymentByOrderSchema = exports.stripeWebhookSchema = exports.initiatePaymentSchema = void 0;
const zod_1 = require("zod");
/**
 * Initiate Payment Request
 * POST /payments/initiate
 */
exports.initiatePaymentSchema = zod_1.z.object({
    body: zod_1.z.object({
        orderId: zod_1.z
            .string()
            .min(1, "Order ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
    })
});
/**
 * Stripe Webhook Event
 * POST /payments/webhook/stripe
 *
 * Note: Body is raw buffer, validated by Stripe signature
 * This schema is for documentation purposes
 */
exports.stripeWebhookSchema = zod_1.z.object({
    headers: zod_1.z.object({
        "stripe-signature": zod_1.z.string().min(1, "Stripe signature is required")
    })
});
/**
 * Get Payment by Order ID
 * GET /payments/order/:orderId
 */
exports.getPaymentByOrderSchema = zod_1.z.object({
    params: zod_1.z.object({
        orderId: zod_1.z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
    })
});
/**
 * Get Payment by Payment ID
 * GET /payments/:id
 */
exports.getPaymentByIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid payment ID format")
    })
});
