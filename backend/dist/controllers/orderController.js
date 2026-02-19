"use strict";
/**
 * Order Controller
 *
 * Handles HTTP requests for order operations.
 * Implements role-based access control at the controller level.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmDeliveryWithOtp = exports.confirmReceived = exports.cancelOrder = exports.startOrder = exports.rejectOrder = exports.acceptOrder = exports.getOrderById = exports.listOrders = exports.createOrder = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const orderService_1 = require("../services/orderService");
const orderService = new orderService_1.OrderService();
/**
 * POST /orders
 * Create new order (Buyer only)
 */
exports.createOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const buyerId = req.user.id;
    const { listingId, quantity, deliveryMethod, deliveryAddress, note } = req.body;
    const result = await orderService.createOrder(buyerId, {
        listingId,
        quantity,
        deliveryMethod: deliveryMethod,
        deliveryAddress,
        note
    });
    res.status(201).json({
        success: true,
        message: result.message,
        data: {
            order: result.order,
            nextStep: result.nextStep
        }
    });
});
/**
 * GET /orders
 * List orders (filtered by role)
 */
exports.listOrders = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, page, limit } = req.query;
    const result = await orderService.listOrders(userId, role, {
        status: status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
    });
    res.status(200).json({
        success: true,
        data: result.orders,
        pagination: result.pagination
    });
});
/**
 * GET /orders/:id
 * Get order by ID
 */
exports.getOrderById = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const result = await orderService.getOrderById(id, userId, role);
    res.status(200).json({
        success: true,
        data: result
    });
});
/**
 * PATCH /orders/:id/accept
 * Accept order (Seller only)
 */
exports.acceptOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    const sellerId = req.user.id;
    const result = await orderService.acceptOrder(id, sellerId);
    res.status(200).json({
        success: true,
        message: result.message,
        data: {
            order: result.order,
            // OTP returned only if enabled (to be sent to buyer)
            ...(result.otp && { deliveryOtp: result.otp })
        }
    });
});
/**
 * PATCH /orders/:id/reject
 * Reject order (Seller only)
 */
exports.rejectOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    const sellerId = req.user.id;
    const { reason } = req.body;
    const result = await orderService.rejectOrder(id, sellerId, reason);
    res.status(200).json({
        success: true,
        message: result.message,
        data: result.order
    });
});
/**
 * PATCH /orders/:id/start
 * Start order (Seller only) - moves to IN_PROGRESS
 */
exports.startOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    const sellerId = req.user.id;
    const result = await orderService.startOrder(id, sellerId);
    res.status(200).json({
        success: true,
        message: result.message,
        data: result.order
    });
});
/**
 * PATCH /orders/:id/cancel
 * Cancel order (Buyer only)
 */
exports.cancelOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    const buyerId = req.user.id;
    const { reason } = req.body;
    const result = await orderService.cancelOrder(id, buyerId, reason);
    res.status(200).json({
        success: true,
        message: result.message,
        data: result.order
    });
});
/**
 * PATCH /orders/:id/confirm-received
 * Confirm delivery received (Buyer only)
 */
exports.confirmReceived = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    const buyerId = req.user.id;
    const result = await orderService.confirmReceived(id, buyerId);
    res.status(200).json({
        success: true,
        message: result.message,
        data: result.order
    });
});
/**
 * POST /orders/:id/confirm-delivery
 * Confirm delivery with OTP (Seller only)
 */
exports.confirmDeliveryWithOtp = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    const sellerId = req.user.id;
    const { otp } = req.body;
    const result = await orderService.confirmDeliveryWithOtp(id, sellerId, otp);
    res.status(200).json({
        success: true,
        message: result.message,
        data: result.order
    });
});
