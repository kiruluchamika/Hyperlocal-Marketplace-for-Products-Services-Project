"use strict";
/**
 * Payment Service
 *
 * Handles Stripe PaymentIntent creation and escrow simulation.
 *
 * ESCROW SIMULATION:
 * 1. INITIATED: PaymentIntent created, waiting for buyer to complete
 * 2. HELD: Payment successful, money "held" until delivery confirmed
 * 3. RELEASED: Order completed, payment "released" to seller
 * 4. REFUNDED: Order cancelled/rejected, payment refunded
 *
 * IMPORTANT:
 * In production, use Stripe Connect with separate accounts for:
 * - Platform (marketplace)
 * - Sellers (vendors)
 * This allows actual fund holding and transfers.
 *
 * For academic projects, we simulate with status tracking.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const env_1 = require("../config/env");
const Order_1 = __importDefault(require("../models/Order"));
const Payment_1 = __importStar(require("../models/Payment"));
const AppError_1 = require("../utils/AppError");
// Initialize Stripe
const stripe = new stripe_1.default(env_1.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia" // Use stable version
});
class PaymentService {
    /**
     * Initiate Payment
     * Creates Stripe PaymentIntent and Payment record
     */
    async initiatePayment(orderId, buyerId) {
        // 1. Verify order exists and buyer owns it
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new AppError_1.AppError("Order not found", 404);
        }
        if (order.buyerId.toString() !== buyerId) {
            throw new AppError_1.AppError("You are not authorized to pay for this order", 403);
        }
        if (order.status !== "PENDING") {
            throw new AppError_1.AppError("Payment can only be initiated for PENDING orders", 400);
        }
        // 2. Check if payment already exists
        const existingPayment = await Payment_1.default.findOne({ orderId: order._id });
        if (existingPayment && existingPayment.status !== Payment_1.PaymentStatus.FAILED) {
            throw new AppError_1.AppError("Payment already initiated for this order", 400);
        }
        // 3. Create Stripe PaymentIntent
        const amount = Math.round(order.totalAmount * 100); // Convert to cents
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: env_1.env.CURRENCY.toLowerCase(),
            metadata: {
                orderId: order._id.toString(),
                buyerId: order.buyerId.toString(),
                sellerId: order.sellerId.toString()
            },
            description: `Order #${order._id.toString().slice(-8)} - ${order.titleSnapshot}`,
            automatic_payment_methods: {
                enabled: true
            }
        });
        // 4. Create Payment record
        const payment = await Payment_1.default.create({
            orderId: order._id,
            buyerId: order.buyerId,
            sellerId: order.sellerId,
            provider: "STRIPE",
            providerPaymentId: paymentIntent.id,
            amount: order.totalAmount,
            currency: env_1.env.CURRENCY,
            status: Payment_1.PaymentStatus.INITIATED,
            metadata: {
                stripePaymentIntentId: paymentIntent.id,
                stripeClientSecret: paymentIntent.client_secret
            }
        });
        // 5. Attach payment to order
        order.paymentId = payment._id;
        await order.save();
        return {
            paymentId: payment._id,
            clientSecret: paymentIntent.client_secret,
            amount: order.totalAmount,
            currency: env_1.env.CURRENCY,
            status: Payment_1.PaymentStatus.INITIATED
        };
    }
    /**
     * Handle Stripe Webhook Events
     * Updates payment status based on Stripe events
     */
    async handleWebhook(payload, signature) {
        let event;
        try {
            // Verify webhook signature
            event = stripe.webhooks.constructEvent(payload, signature, env_1.env.STRIPE_WEBHOOK_SECRET);
        }
        catch (err) {
            throw new AppError_1.AppError(`Webhook signature verification failed: ${err.message}`, 400);
        }
        // Handle specific events
        switch (event.type) {
            case "payment_intent.succeeded":
                await this.handlePaymentSuccess(event.data.object);
                break;
            case "payment_intent.payment_failed":
                await this.handlePaymentFailed(event.data.object);
                break;
            case "payment_intent.canceled":
                await this.handlePaymentCanceled(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        return { received: true };
    }
    /**
     * Handle Successful Payment
     * Updates payment status to HELD (escrow)
     */
    async handlePaymentSuccess(paymentIntent) {
        const payment = await Payment_1.default.findOne({
            providerPaymentId: paymentIntent.id
        });
        if (!payment) {
            console.error(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
            return;
        }
        // Update payment status to HELD (in escrow)
        payment.status = Payment_1.PaymentStatus.HELD;
        await payment.save();
        console.log(`Payment ${payment._id} marked as HELD (escrow)`);
    }
    /**
     * Handle Failed Payment
     */
    async handlePaymentFailed(paymentIntent) {
        const payment = await Payment_1.default.findOne({
            providerPaymentId: paymentIntent.id
        });
        if (!payment) {
            console.error(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
            return;
        }
        payment.status = Payment_1.PaymentStatus.FAILED;
        await payment.save();
        console.log(`Payment ${payment._id} marked as FAILED`);
    }
    /**
     * Handle Canceled Payment
     */
    async handlePaymentCanceled(paymentIntent) {
        const payment = await Payment_1.default.findOne({
            providerPaymentId: paymentIntent.id
        });
        if (!payment) {
            return;
        }
        payment.status = Payment_1.PaymentStatus.REFUNDED;
        await payment.save();
    }
    /**
     * Release Payment to Seller
     * Called when order is completed
     */
    async releasePayment(orderId) {
        const payment = await Payment_1.default.findOne({ orderId });
        if (!payment) {
            throw new AppError_1.AppError("Payment not found for this order", 404);
        }
        if (payment.status !== Payment_1.PaymentStatus.HELD) {
            throw new AppError_1.AppError(`Cannot release payment with status: ${payment.status}`, 400);
        }
        // In production with Stripe Connect:
        // - Create transfer to seller's connected account
        // - Deduct platform fee
        // For simulation, just update status
        payment.status = Payment_1.PaymentStatus.RELEASED;
        await payment.save();
        console.log(`Payment ${payment._id} RELEASED to seller ${payment.sellerId}`);
        return payment;
    }
    /**
     * Refund Payment to Buyer
     * Called when order is cancelled or rejected
     */
    async refundPayment(orderId) {
        const payment = await Payment_1.default.findOne({ orderId });
        if (!payment) {
            throw new AppError_1.AppError("Payment not found for this order", 404);
        }
        if (![Payment_1.PaymentStatus.INITIATED, Payment_1.PaymentStatus.HELD].includes(payment.status)) {
            throw new AppError_1.AppError(`Cannot refund payment with status: ${payment.status}`, 400);
        }
        // In production:
        // await stripe.refunds.create({ payment_intent: payment.providerPaymentId });
        // For simulation, just update status
        payment.status = Payment_1.PaymentStatus.REFUNDED;
        await payment.save();
        console.log(`Payment ${payment._id} REFUNDED to buyer ${payment.buyerId}`);
        return payment;
    }
    /**
     * Get Payment by Order ID
     */
    async getPaymentByOrderId(orderId, userId, role) {
        const payment = await Payment_1.default.findOne({ orderId })
            .populate("orderId", "status titleSnapshot")
            .populate("buyerId", "name email")
            .populate("sellerId", "name email");
        if (!payment) {
            throw new AppError_1.AppError("Payment not found", 404);
        }
        // Authorization: only buyer, seller, or admin
        const isBuyer = payment.buyerId._id.toString() === userId;
        const isSeller = payment.sellerId._id.toString() === userId;
        const isAdmin = role === "admin";
        if (!isBuyer && !isSeller && !isAdmin) {
            throw new AppError_1.AppError("You are not authorized to view this payment", 403);
        }
        return payment;
    }
    /**
     * Get Payment by Payment ID
     */
    async getPaymentById(paymentId, userId, role) {
        const payment = await Payment_1.default.findById(paymentId)
            .populate("orderId", "status titleSnapshot")
            .populate("buyerId", "name email")
            .populate("sellerId", "name email");
        if (!payment) {
            throw new AppError_1.AppError("Payment not found", 404);
        }
        // Authorization
        const isBuyer = payment.buyerId._id.toString() === userId;
        const isSeller = payment.sellerId._id.toString() === userId;
        const isAdmin = role === "admin";
        if (!isBuyer && !isSeller && !isAdmin) {
            throw new AppError_1.AppError("You are not authorized to view this payment", 403);
        }
        return payment;
    }
}
exports.PaymentService = PaymentService;
