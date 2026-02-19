"use strict";
/**
 * Payment Controller
 *
 * Handles HTTP requests for payment operations.
 * Routes → Controller → Service → Database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentById = exports.getPaymentByOrder = exports.stripeWebhook = exports.initiatePayment = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const paymentService_1 = require("../services/paymentService");
const paymentService = new paymentService_1.PaymentService();
/**
 * POST /payments/initiate
 * Initiate payment for an order
 */
exports.initiatePayment = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { orderId } = req.body;
    const buyerId = req.user.id;
    const result = await paymentService.initiatePayment(orderId, buyerId);
    res.status(200).json({
        success: true,
        message: "Payment initiated successfully",
        data: result
    });
});
/**
 * POST /payments/webhook/stripe
 * Handle Stripe webhook events
 *
 * Note: Uses raw body (express.raw()) for signature verification
 */
exports.stripeWebhook = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
        res.status(400).json({
            success: false,
            message: "Missing stripe-signature header"
        });
        return;
    }
    // req.body is Buffer when using express.raw()
    const payload = req.body;
    await paymentService.handleWebhook(payload, signature);
    // Stripe expects 200 response
    res.status(200).json({ received: true });
});
/**
 * GET /payments/order/:orderId
 * Get payment by order ID
 */
exports.getPaymentByOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { orderId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const payment = await paymentService.getPaymentByOrderId(orderId, userId, role);
    res.status(200).json({
        success: true,
        data: payment
    });
});
/**
 * GET /payments/:id
 * Get payment by payment ID
 */
exports.getPaymentById = (0, asyncHandler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const payment = await paymentService.getPaymentById(id, userId, role);
    res.status(200).json({
        success: true,
        data: payment
    });
});
