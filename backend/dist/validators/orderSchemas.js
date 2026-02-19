"use strict";
/**
 * Order Validators
 *
 * Zod schemas for validating order-related requests.
 * Applied in controllers before business logic execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmDeliveryWithOtpSchema = exports.confirmReceivedSchema = exports.cancelOrderSchema = exports.updateOrderStatusSchema = exports.listOrdersSchema = exports.getOrderByIdSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
const Order_1 = require("../models/Order");
/**
 * Create Order Request
 * POST /orders
 */
exports.createOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        listingId: zod_1.z
            .string()
            .min(1, "Listing ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid listing ID format"),
        quantity: zod_1.z
            .number()
            .int("Quantity must be an integer")
            .min(1, "Quantity must be at least 1")
            .max(1000, "Quantity cannot exceed 1000")
            .default(1),
        deliveryMethod: zod_1.z.enum([Order_1.DeliveryMethod.PICKUP, Order_1.DeliveryMethod.DELIVERY], {
            errorMap: () => ({ message: "Delivery method must be PICKUP or DELIVERY" })
        }),
        deliveryAddress: zod_1.z
            .string()
            .trim()
            .min(10, "Delivery address must be at least 10 characters")
            .max(500, "Delivery address cannot exceed 500 characters")
            .optional(),
        note: zod_1.z
            .string()
            .trim()
            .max(500, "Note cannot exceed 500 characters")
            .optional()
    }).refine((data) => {
        // If delivery method is DELIVERY, address is required
        if (data.deliveryMethod === Order_1.DeliveryMethod.DELIVERY) {
            return !!data.deliveryAddress;
        }
        return true;
    }, {
        message: "Delivery address is required when delivery method is DELIVERY",
        path: ["deliveryAddress"]
    })
});
/**
 * Get Order by ID
 * GET /orders/:id
 */
exports.getOrderByIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
    })
});
/**
 * List Orders with Filters
 * GET /orders
 */
exports.listOrdersSchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z
            .enum([
            Order_1.OrderStatus.PENDING,
            Order_1.OrderStatus.ACCEPTED,
            Order_1.OrderStatus.REJECTED,
            Order_1.OrderStatus.IN_PROGRESS,
            Order_1.OrderStatus.COMPLETED,
            Order_1.OrderStatus.CANCELLED
        ])
            .optional(),
        page: zod_1.z
            .string()
            .regex(/^\d+$/, "Page must be a number")
            .transform(Number)
            .pipe(zod_1.z.number().min(1, "Page must be at least 1"))
            .default("1"),
        limit: zod_1.z
            .string()
            .regex(/^\d+$/, "Limit must be a number")
            .transform(Number)
            .pipe(zod_1.z.number().min(1).max(100, "Limit cannot exceed 100"))
            .default("10")
    })
});
/**
 * Update Order Status (Seller Actions)
 * PATCH /orders/:id/accept
 * PATCH /orders/:id/reject
 * PATCH /orders/:id/start
 */
exports.updateOrderStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
    }),
    body: zod_1.z.object({
        reason: zod_1.z
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
exports.cancelOrderSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
    }),
    body: zod_1.z.object({
        reason: zod_1.z
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
exports.confirmReceivedSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
    })
});
/**
 * Confirm Delivery with OTP (Seller)
 * POST /orders/:id/confirm-delivery
 */
exports.confirmDeliveryWithOtpSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID format")
    }),
    body: zod_1.z.object({
        otp: zod_1.z
            .string()
            .length(6, "OTP must be exactly 6 digits")
            .regex(/^\d{6}$/, "OTP must contain only digits")
    })
});
