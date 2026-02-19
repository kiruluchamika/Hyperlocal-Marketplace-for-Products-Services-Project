/**
 * Order Validators
 * 
 * Zod schemas for validating order-related requests.
 * Applied in controllers before business logic execution.
 */

import { z } from "zod";
import { DeliveryMethod, OrderStatus } from "../models/Order";

/**
 * Create Order Request
 * POST /orders
 */
export const createOrderSchema = z.object({
  body: z.object({
    listingId: z
      .string()
      .min(1, "Listing ID is required")
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid listing ID format"),
    
    quantity: z
      .number()
      .int("Quantity must be an integer")
      .min(1, "Quantity must be at least 1")
      .max(1000, "Quantity cannot exceed 1000")
      .default(1),
    
    deliveryMethod: z.enum([DeliveryMethod.PICKUP, DeliveryMethod.DELIVERY], {
      errorMap: () => ({ message: "Delivery method must be PICKUP or DELIVERY" })
    }),
    
    deliveryAddress: z
      .string()
      .trim()
      .min(10, "Delivery address must be at least 10 characters")
      .max(500, "Delivery address cannot exceed 500 characters")
      .optional(),
    
    note: z
      .string()
      .trim()
      .max(500, "Note cannot exceed 500 characters")
      .optional()
  }).refine(
    (data) => {
      // If delivery method is DELIVERY, address is required
      if (data.deliveryMethod === DeliveryMethod.DELIVERY) {
        return !!data.deliveryAddress;
      }
      return true;
    },
    {
      message: "Delivery address is required when delivery method is DELIVERY",
      path: ["deliveryAddress"]
    }
  )
});

/**
 * Get Order by ID
 * GET /orders/:id
 */
export const getOrderByIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
  })
});

/**
 * List Orders with Filters
 * GET /orders
 */
export const listOrdersSchema = z.object({
  query: z.object({
    status: z
      .enum([
        OrderStatus.PENDING,
        OrderStatus.ACCEPTED,
        OrderStatus.REJECTED,
        OrderStatus.IN_PROGRESS,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED
      ])
      .optional(),
    
    page: z
      .string()
      .regex(/^\d+$/, "Page must be a number")
      .transform(Number)
      .pipe(z.number().min(1, "Page must be at least 1"))
      .default("1"),
    
    limit: z
      .string()
      .regex(/^\d+$/, "Limit must be a number")
      .transform(Number)
      .pipe(z.number().min(1).max(100, "Limit cannot exceed 100"))
      .default("10")
  })
});

/**
 * Update Order Status (Seller Actions)
 * PATCH /orders/:id/accept
 * PATCH /orders/:id/reject
 * PATCH /orders/:id/start
 */
export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
  }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(10, "Reason must be at least 10 characters")
      .max(500, "Reason cannot exceed 500 characters")
      .optional()
  }).optional()
});

/**
 * Cancel Order (Buyer)
 * PATCH /orders/:id/cancel
 */
export const cancelOrderSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
  }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(10, "Cancellation reason must be at least 10 characters")
      .max(500, "Cancellation reason cannot exceed 500 characters")
      .optional()
  }).optional()
});

/**
 * Confirm Delivery Received (Buyer)
 * PATCH /orders/:id/confirm-received
 */
export const confirmReceivedSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
  })
});

/**
 * Confirm Delivery with OTP (Seller)
 * POST /orders/:id/confirm-delivery
 */
export const confirmDeliveryWithOtpSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
  }),
  body: z.object({
    otp: z
      .string()
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only digits")
  })
});

// Export types for TypeScript
export type CreateOrderInput = z.infer<typeof createOrderSchema>["body"];
export type ListOrdersQuery = z.infer<typeof listOrdersSchema>["query"];
export type ConfirmDeliveryWithOtpInput = z.infer<typeof confirmDeliveryWithOtpSchema>["body"];
