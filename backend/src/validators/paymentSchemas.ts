/**
 * Payment Validators
 * 
 * Zod schemas for validating payment-related requests.
 * Used for payment initiation and webhook processing.
 */

import { z } from "zod";

/**
 * Initiate Payment Request
 * POST /payments/initiate
 */
export const initiatePaymentSchema = z.object({
  orderId: z
    .string()
    .min(1, "Order ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
});

/**
 * Confirm Payment Request
 * POST /payments/confirm
 */
export const confirmPaymentSchema = z.object({
  orderId: z
    .string()
    .min(1, "Order ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format"),
  paymentIntentId: z.string().min(1).optional(),
});

/**
 * Stripe Webhook Event
 * POST /payments/webhook/stripe
 * 
 * Note: Body is raw buffer, validated by Stripe signature
 * This schema is for documentation purposes
 */
export const stripeWebhookSchema = z.object({
  headers: z.object({
    "stripe-signature": z.string().min(1, "Stripe signature is required")
  })
});

/**
 * Get Payment by Order ID
 * GET /payments/order/:orderId
 */
export const getPaymentByOrderSchema = z.object({
  orderId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
});

/**
 * Get Payment by Payment ID
 * GET /payments/:id
 */
export const getPaymentByIdSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid payment ID format")
});

// Export types for TypeScript
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
