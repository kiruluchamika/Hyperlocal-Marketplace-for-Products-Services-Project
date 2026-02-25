/**
 * Order Routes
 * 
 * Defines order-related endpoints with role-based access control (RBAC).
 * 
 * RBAC Design:
 * - Buyers: Create, view own, cancel (PENDING only), confirm delivery
 * - Sellers: View orders for their listings, accept/reject/start/complete
 * - Admins: View all orders, override status
 */

import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { validateOrder } from "../middlewares/validateOrder";
import {
  createOrderSchema,
  listOrdersSchema,
  getOrderByIdSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  confirmReceivedSchema,
  confirmDeliveryWithOtpSchema,
  updateDeliveryDetailsSchema
} from "../validators/orderSchemas";
import {
  createOrder,
  listOrders,
  getOrderById,
  acceptOrder,
  rejectOrder,
  startOrder,
  cancelOrder,
  confirmReceived,
  confirmDeliveryWithOtp,
  updateDeliveryDetails
} from "../controllers/orderController";

const router = Router();

// ============================================
// BUYER ROUTES
// ============================================

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create new order (Buyer only)
 *     description: Create a new order for a product listing with BUY_NOW transaction mode
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, quantity, deliveryMethod]
 *             properties:
 *               listingId:
 *                 type: string
 *                 description: MongoDB ObjectId of the listing
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 description: Quantity to order
 *               deliveryMethod:
 *                 type: string
 *                 enum: [PICKUP, DELIVERY]
 *                 description: "PICKUP = Buyer picks up from seller location (auto-captured), DELIVERY = Seller delivers to buyer address (required)"
 *               deliveryAddress:
 *                 type: string
 *                 description: "Required if deliveryMethod is DELIVERY. Full delivery address (min 10 chars, max 500 chars)"
 *                 example: "123 Main Street, Apartment 4B, Colombo 00300"
 *               note:
 *                 type: string
 *                 description: Optional note from buyer to seller (max 500 chars)
 *     responses:
 *       201:
 *         description: Order created successfully. If PICKUP chosen, pickupLocationSnapshot will be auto-captured from listing location.
 *       400:
 *         description: Validation error or listing unavailable
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires buyer role
 */
router.post(
  "/",
  auth,
  requireRole(["user"]),
  validateOrder(createOrderSchema),
  createOrder
);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   patch:
 *     tags: [Orders]
 *     summary: Cancel order (Buyer only)
 *     description: Cancel an order in PENDING status. Payment will be automatically refunded.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Cannot cancel order (invalid status)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or not order owner
 *       404:
 *         description: Order not found
 */
router.patch(
  "/:id/cancel",
  auth,
  requireRole(["user"]),
  validateOrder(cancelOrderSchema),
  cancelOrder
);

/**
 * @openapi
 * /orders/{id}/confirm-received:
 *   patch:
 *     tags: [Orders]
 *     summary: Confirm delivery received (Buyer only)
 *     description: Mark order as COMPLETED when received. Triggers payment release to seller.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order marked as completed, payment released
 *       400:
 *         description: Invalid order status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or not order owner
 *       404:
 *         description: Order not found
 */
router.patch(
  "/:id/confirm-received",
  auth,
  requireRole(["user"]),
  validateOrder(confirmReceivedSchema),
  confirmReceived
);

/**
 * @openapi
 * /orders/{id}/delivery-details:
 *   put:
 *     tags: [Orders]
 *     summary: Update delivery details (Buyer only)
 *     description: |
 *       Replace complete delivery configuration for PENDING orders only.
 *       Allows buyer to change delivery method or address before seller accepts.
 *       Cannot update after seller accepts or if payment already confirmed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [deliveryMethod]
 *                 properties:
 *                   deliveryMethod:
 *                     type: string
 *                     enum: [PICKUP]
 *                     description: Switch to pickup (no address needed)
 *               - type: object
 *                 required: [deliveryMethod, deliveryAddress]
 *                 properties:
 *                   deliveryMethod:
 *                     type: string
 *                     enum: [DELIVERY]
 *                     description: Use delivery method
 *                   deliveryAddress:
 *                     type: string
 *                     minLength: 10
 *                     maxLength: 500
 *                     description: Complete delivery address
 *     responses:
 *       200:
 *         description: Delivery details updated successfully
 *       400:
 *         description: Cannot update (order not PENDING or payment already confirmed)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or not order owner
 *       404:
 *         description: Order not found
 */
router.put(
  "/:id/delivery-details",
  auth,
  requireRole(["user"]),
  validateOrder(updateDeliveryDetailsSchema),
  updateDeliveryDetails
);

// ============================================
// SELLER ROUTES
// ============================================

/**
 * @openapi
 * /orders/{id}/accept:
 *   patch:
 *     tags: [Orders]
 *     summary: Accept order (Seller only)
 *     description: Accept a PENDING order. Generates OTP for delivery confirmation if enabled.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order accepted, status changed to ACCEPTED
 *       400:
 *         description: Invalid order status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or not listing owner
 *       404:
 *         description: Order not found
 */
router.patch(
  "/:id/accept",
  auth,
  requireRole(["user"]),
  validateOrder(updateOrderStatusSchema),
  acceptOrder
);

/**
 * @openapi
 * /orders/{id}/reject:
 *   patch:
 *     tags: [Orders]
 *     summary: Reject order (Seller only)
 *     description: Reject a PENDING order. Payment will be automatically refunded.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order rejected, payment refunded
 *       400:
 *         description: Invalid order status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or not listing owner
 *       404:
 *         description: Order not found
 */
router.patch(
  "/:id/reject",
  auth,
  requireRole(["user"]),
  validateOrder(updateOrderStatusSchema),
  rejectOrder
);

/**
 * @openapi
 * /orders/{id}/start:
 *   patch:
 *     tags: [Orders]
 *     summary: Start order fulfillment (Seller only)
 *     description: Move order from ACCEPTED to IN_PROGRESS status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order started, status changed to IN_PROGRESS
 *       400:
 *         description: Invalid order status (must be ACCEPTED)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or not listing owner
 *       404:
 *         description: Order not found
 */
router.patch(
  "/:id/start",
  auth,
  requireRole(["user"]),
  validateOrder(updateOrderStatusSchema),
  startOrder
);

/**
 * @openapi
 * /orders/{id}/confirm-delivery:
 *   post:
 *     tags: [Orders]
 *     summary: Confirm delivery with OTP (Seller only)
 *     description: Verify 6-digit OTP from buyer and mark order COMPLETED. Releases payment to seller.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 description: 6-digit OTP provided by buyer
 *     responses:
 *       200:
 *         description: OTP verified, order completed, payment released
 *       400:
 *         description: Invalid OTP, expired, or too many attempts
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or not listing owner
 *       404:
 *         description: Order not found
 */
router.post(
  "/:id/confirm-delivery",
  auth,
  requireRole(["user"]),
  validateOrder(confirmDeliveryWithOtpSchema),
  confirmDeliveryWithOtp
);

// ============================================
// SHARED ROUTES (Buyers + Sellers + Admin)
// ============================================

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders (role-filtered)
 *     description: |
 *       Get list of orders filtered by user role:
 *       - Buyer: sees own orders
 *       - Seller: sees orders for their listings
 *       - Admin: sees all orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED]
 *         description: Filter by order status
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of orders with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  auth,
  requireRole(["user", "admin"]),
  validateOrder(listOrdersSchema),
  listOrders
);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order by ID
 *     description: Retrieve order details with role-based authorization (buyer can see own, seller can see their listing orders, admin sees all)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details including actions allowed for current user
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not authorized to view this order
 *       404:
 *         description: Order not found
 */
router.get(
  "/:id",
  auth,
  requireRole(["user", "admin"]),
  validateOrder(getOrderByIdSchema),
  getOrderById
);

export default router;
