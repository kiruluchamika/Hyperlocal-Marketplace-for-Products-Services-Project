"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const requireRole_1 = require("../middlewares/requireRole");
const validate_1 = require("../middlewares/validate");
const orderSchemas_1 = require("../validators/orderSchemas");
const orderController_1 = require("../controllers/orderController");
const router = (0, express_1.Router)();
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
 *                 description: How the order will be fulfilled
 *               deliveryAddress:
 *                 type: object
 *                 description: Required if deliveryMethod is DELIVERY
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *                   country:
 *                     type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error or listing unavailable
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires buyer role
 */
router.post("/", auth_1.auth, (0, requireRole_1.requireRole)(["buyer"]), (0, validate_1.validate)(orderSchemas_1.createOrderSchema), orderController_1.createOrder);
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
router.patch("/:id/cancel", auth_1.auth, (0, requireRole_1.requireRole)(["buyer"]), (0, validate_1.validate)(orderSchemas_1.cancelOrderSchema), orderController_1.cancelOrder);
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
router.patch("/:id/confirm-received", auth_1.auth, (0, requireRole_1.requireRole)(["buyer"]), (0, validate_1.validate)(orderSchemas_1.confirmReceivedSchema), orderController_1.confirmReceived);
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
router.patch("/:id/accept", auth_1.auth, (0, requireRole_1.requireRole)(["seller"]), (0, validate_1.validate)(orderSchemas_1.updateOrderStatusSchema), orderController_1.acceptOrder);
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
router.patch("/:id/reject", auth_1.auth, (0, requireRole_1.requireRole)(["seller"]), (0, validate_1.validate)(orderSchemas_1.updateOrderStatusSchema), orderController_1.rejectOrder);
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
router.patch("/:id/start", auth_1.auth, (0, requireRole_1.requireRole)(["seller"]), (0, validate_1.validate)(orderSchemas_1.updateOrderStatusSchema), orderController_1.startOrder);
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
router.post("/:id/confirm-delivery", auth_1.auth, (0, requireRole_1.requireRole)(["seller"]), (0, validate_1.validate)(orderSchemas_1.confirmDeliveryWithOtpSchema), orderController_1.confirmDeliveryWithOtp);
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
router.get("/", auth_1.auth, (0, requireRole_1.requireRole)(["buyer", "seller", "admin"]), (0, validate_1.validate)(orderSchemas_1.listOrdersSchema), orderController_1.listOrders);
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
router.get("/:id", auth_1.auth, (0, requireRole_1.requireRole)(["buyer", "seller", "admin"]), (0, validate_1.validate)(orderSchemas_1.getOrderByIdSchema), orderController_1.getOrderById);
exports.default = router;
