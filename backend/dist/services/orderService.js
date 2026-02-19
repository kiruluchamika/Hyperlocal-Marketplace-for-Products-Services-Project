"use strict";
/**
 * Order Service
 *
 * Implements all business logic for order lifecycle management.
 *
 * BUSINESS RULES:
 * 1. Buyer can only order active, available PRODUCT listings with BUY_NOW mode
 * 2. Buyer cannot order their own listing
 * 3. Seller can only accept/reject/start orders for their listings
 * 4. Payment must be HELD before seller can accept
 * 5. Only PENDING orders can be accepted/rejected/cancelled
 * 6. Only ACCEPTED orders can be started (move to IN_PROGRESS)
 * 7. Only IN_PROGRESS orders can be completed
 * 8. Completed orders trigger payment RELEASE
 * 9. Cancelled/rejected orders trigger payment REFUND
 *
 * OTP DELIVERY:
 * - Generated when seller accepts order (if enabled)
 * - Buyer receives OTP to share with seller physically
 * - Seller enters OTP to confirm delivery
 * - Prevents fraudulent completion claims
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
exports.OrderService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../config/env");
const AppError_1 = require("../utils/AppError");
const Order_1 = __importStar(require("../models/Order"));
const Payment_1 = __importStar(require("../models/Payment"));
const paymentService_1 = require("./paymentService");
const listing_interface_1 = require("../types/listing.interface");
class OrderService {
    constructor() {
        this.paymentService = new paymentService_1.PaymentService();
    }
    /**
     * Create Order
     * Validates listing eligibility and creates order with snapshots
     */
    async createOrder(buyerId, data) {
        // 1. Fetch listing
        const listing = await listing_interface_1.ListingModel.findById(data.listingId);
        if (!listing) {
            throw new AppError_1.AppError("Listing not found", 404);
        }
        // 2. Validate listing eligibility
        if (listing.type !== "PRODUCT") {
            throw new AppError_1.AppError("Only PRODUCT listings can be ordered", 400);
        }
        if (listing.transactionMode !== "BUY_NOW") {
            throw new AppError_1.AppError("Only BUY_NOW listings can be ordered", 400);
        }
        if (!listing.isActive) {
            throw new AppError_1.AppError("Listing is not active", 400);
        }
        if (!listing.isAvailable) {
            throw new AppError_1.AppError("Listing is not available", 400);
        }
        // 3. Prevent self-purchase
        if (listing.ownerId.toString() === buyerId) {
            throw new AppError_1.AppError("You cannot order your own listing", 400);
        }
        // 4. Validate delivery address if DELIVERY method
        if (data.deliveryMethod === Order_1.DeliveryMethod.DELIVERY && !data.deliveryAddress) {
            throw new AppError_1.AppError("Delivery address is required for DELIVERY method", 400);
        }
        // 5. Calculate total
        const totalAmount = listing.price * data.quantity;
        // 6. Create order with snapshots
        const order = await Order_1.default.create({
            buyerId,
            sellerId: listing.ownerId,
            listingId: listing._id,
            titleSnapshot: listing.title,
            unitPriceSnapshot: listing.price,
            quantity: data.quantity,
            totalAmount,
            deliveryMethod: data.deliveryMethod,
            deliveryAddress: data.deliveryAddress,
            note: data.note,
            status: Order_1.OrderStatus.PENDING
        });
        // Populate for response
        await order.populate("buyerId", "name email");
        await order.populate("sellerId", "name email");
        await order.populate("listingId", "title price");
        return {
            order,
            message: "Order created successfully. Please proceed to payment.",
            nextStep: "INITIATE_PAYMENT"
        };
    }
    /**
     * Accept Order (Seller)
     * Requires payment to be HELD. Optionally generates OTP.
     */
    async acceptOrder(orderId, sellerId) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new AppError_1.AppError("Order not found", 404);
        }
        // Verify seller ownership
        if (order.sellerId.toString() !== sellerId) {
            throw new AppError_1.AppError("You are not authorized to accept this order", 403);
        }
        // Verify status
        if (order.status !== Order_1.OrderStatus.PENDING) {
            throw new AppError_1.AppError("Only PENDING orders can be accepted", 400);
        }
        // Verify payment is HELD
        const payment = await Payment_1.default.findById(order.paymentId);
        if (!payment || payment.status !== Payment_1.PaymentStatus.HELD) {
            throw new AppError_1.AppError("Payment must be completed and held before accepting order", 400);
        }
        // Update status
        order.status = Order_1.OrderStatus.ACCEPTED;
        // Generate OTP if enabled
        let otp;
        if (env_1.env.ENABLE_OTP_DELIVERY === "true") {
            otp = this.generateOTP();
            order.deliveryOtpHash = await bcryptjs_1.default.hash(otp, 10);
            order.deliveryOtpExpiresAt = new Date(Date.now() + parseInt(env_1.env.OTP_EXPIRY_MINUTES) * 60 * 1000);
            order.deliveryOtpAttempts = 0;
        }
        await order.save();
        return {
            order,
            otp, // Return OTP to be sent to buyer
            message: "Order accepted successfully"
        };
    }
    /**
     * Reject Order (Seller)
     * Triggers payment refund
     */
    async rejectOrder(orderId, sellerId, reason) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new AppError_1.AppError("Order not found", 404);
        }
        // Verify seller ownership
        if (order.sellerId.toString() !== sellerId) {
            throw new AppError_1.AppError("You are not authorized to reject this order", 403);
        }
        // Verify status
        if (order.status !== Order_1.OrderStatus.PENDING) {
            throw new AppError_1.AppError("Only PENDING orders can be rejected", 400);
        }
        // Update status
        order.status = Order_1.OrderStatus.REJECTED;
        await order.save();
        // Refund payment if exists
        if (order.paymentId) {
            await this.paymentService.refundPayment(order._id.toString());
        }
        return {
            order,
            message: `Order rejected${reason ? `: ${reason}` : ""}`
        };
    }
    /**
     * Start Order (Seller)
     * Moves from ACCEPTED to IN_PROGRESS
     */
    async startOrder(orderId, sellerId) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new AppError_1.AppError("Order not found", 404);
        }
        // Verify seller ownership
        if (order.sellerId.toString() !== sellerId) {
            throw new AppError_1.AppError("You are not authorized to start this order", 403);
        }
        // Verify status
        if (order.status !== Order_1.OrderStatus.ACCEPTED) {
            throw new AppError_1.AppError("Only ACCEPTED orders can be started", 400);
        }
        // Update status
        order.status = Order_1.OrderStatus.IN_PROGRESS;
        await order.save();
        return {
            order,
            message: "Order marked as in progress"
        };
    }
    /**
     * Cancel Order (Buyer)
     * Only PENDING orders can be cancelled. Triggers refund.
     */
    async cancelOrder(orderId, buyerId, reason) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new AppError_1.AppError("Order not found", 404);
        }
        // Verify buyer ownership
        if (order.buyerId.toString() !== buyerId) {
            throw new AppError_1.AppError("You are not authorized to cancel this order", 403);
        }
        // Verify status
        if (order.status !== Order_1.OrderStatus.PENDING) {
            throw new AppError_1.AppError("Only PENDING orders can be cancelled", 400);
        }
        // Update status
        order.status = Order_1.OrderStatus.CANCELLED;
        await order.save();
        // Refund payment if exists
        if (order.paymentId) {
            await this.paymentService.refundPayment(order._id.toString());
        }
        return {
            order,
            message: `Order cancelled${reason ? `: ${reason}` : ""}`
        };
    }
    /**
     * Confirm Delivery Received (Buyer)
     * Completes order without OTP. Releases payment.
     */
    async confirmReceived(orderId, buyerId) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new AppError_1.AppError("Order not found", 404);
        }
        // Verify buyer ownership
        if (order.buyerId.toString() !== buyerId) {
            throw new AppError_1.AppError("You are not authorized to confirm this order", 403);
        }
        // Verify status
        if (order.status !== Order_1.OrderStatus.IN_PROGRESS) {
            throw new AppError_1.AppError("Only IN_PROGRESS orders can be confirmed", 400);
        }
        // Update status
        order.status = Order_1.OrderStatus.COMPLETED;
        await order.save();
        // Release payment
        await this.paymentService.releasePayment(order._id.toString());
        return {
            order,
            message: "Order completed successfully. Payment released to seller."
        };
    }
    /**
     * Confirm Delivery with OTP (Seller)
     * Verifies OTP and completes order. Releases payment.
     */
    async confirmDeliveryWithOtp(orderId, sellerId, otp) {
        const order = await Order_1.default.findById(orderId).select("+deliveryOtpHash");
        if (!order) {
            throw new AppError_1.AppError("Order not found", 404);
        }
        // Verify seller ownership
        if (order.sellerId.toString() !== sellerId) {
            throw new AppError_1.AppError("You are not authorized to complete this order", 403);
        }
        // Verify status
        if (order.status !== Order_1.OrderStatus.IN_PROGRESS) {
            throw new AppError_1.AppError("Only IN_PROGRESS orders can be completed", 400);
        }
        // Verify OTP exists
        if (!order.deliveryOtpHash) {
            throw new AppError_1.AppError("OTP delivery confirmation not enabled for this order", 400);
        }
        // Check expiry
        if (order.deliveryOtpExpiresAt && order.deliveryOtpExpiresAt < new Date()) {
            throw new AppError_1.AppError("OTP has expired", 400);
        }
        // Check attempts (max 3)
        if (order.deliveryOtpAttempts && order.deliveryOtpAttempts >= 3) {
            throw new AppError_1.AppError("Maximum OTP attempts exceeded", 400);
        }
        // Verify OTP
        const isValid = await bcryptjs_1.default.compare(otp, order.deliveryOtpHash);
        if (!isValid) {
            // Increment attempts
            order.deliveryOtpAttempts = (order.deliveryOtpAttempts || 0) + 1;
            await order.save();
            throw new AppError_1.AppError(`Invalid OTP. ${3 - order.deliveryOtpAttempts} attempts remaining.`, 400);
        }
        // OTP valid - complete order
        order.status = Order_1.OrderStatus.COMPLETED;
        order.deliveryOtpHash = undefined; // Clear OTP
        await order.save();
        // Release payment
        await this.paymentService.releasePayment(order._id.toString());
        return {
            order,
            message: "Delivery confirmed. Order completed. Payment released to seller."
        };
    }
    /**
     * Get Order by ID
     * With role-based access control
     */
    async getOrderById(orderId, userId, role) {
        const order = await Order_1.default.findById(orderId)
            .populate("buyerId", "name email")
            .populate("sellerId", "name email")
            .populate("listingId", "title price")
            .populate("paymentId");
        if (!order) {
            throw new AppError_1.AppError("Order not found", 404);
        }
        // Authorization
        const isBuyer = order.buyerId._id.toString() === userId;
        const isSeller = order.sellerId._id.toString() === userId;
        const isAdmin = role === "admin";
        if (!isBuyer && !isSeller && !isAdmin) {
            throw new AppError_1.AppError("You are not authorized to view this order", 403);
        }
        // Attach allowed actions based on role and status
        const actionsAllowed = this.getActionsAllowed(order, userId, role);
        return {
            order,
            actionsAllowed
        };
    }
    /**
     * List Orders
     * Filtered by role (buyer sees own, seller sees orders for their listings)
     */
    async listOrders(userId, role, filters) {
        const page = filters.page || 1;
        const limit = Math.min(filters.limit || 10, 100);
        const skip = (page - 1) * limit;
        // Build query based on role
        const query = {};
        if (role === "buyer") {
            query.buyerId = userId;
        }
        else if (role === "seller") {
            query.sellerId = userId;
        }
        // admin sees all
        if (filters.status) {
            query.status = filters.status;
        }
        const [orders, total] = await Promise.all([
            Order_1.default.find(query)
                .populate("buyerId", "name email")
                .populate("sellerId", "name email")
                .populate("listingId", "title price")
                .populate("paymentId")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order_1.default.countDocuments(query)
        ]);
        // Attach actions for each order
        const ordersWithActions = orders.map((order) => ({
            order,
            actionsAllowed: this.getActionsAllowed(order, userId, role)
        }));
        return {
            orders: ordersWithActions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    /**
     * Get Allowed Actions
     * Returns UI-friendly list of actions based on role and order status
     */
    getActionsAllowed(order, userId, role) {
        const actions = [];
        const isBuyer = order.buyerId._id.toString() === userId;
        const isSeller = order.sellerId._id.toString() === userId;
        if (isBuyer) {
            if (order.status === Order_1.OrderStatus.PENDING) {
                actions.push("CANCEL", "INITIATE_PAYMENT");
            }
            if (order.status === Order_1.OrderStatus.IN_PROGRESS) {
                actions.push("CONFIRM_RECEIVED");
            }
        }
        if (isSeller) {
            if (order.status === Order_1.OrderStatus.PENDING) {
                actions.push("ACCEPT", "REJECT");
            }
            if (order.status === Order_1.OrderStatus.ACCEPTED) {
                actions.push("START");
            }
            if (order.status === Order_1.OrderStatus.IN_PROGRESS) {
                if (env_1.env.ENABLE_OTP_DELIVERY === "true" && order.deliveryOtpHash) {
                    actions.push("COMPLETE_WITH_OTP");
                }
                else {
                    actions.push("MARK_COMPLETED");
                }
            }
        }
        if (role === "admin") {
            actions.push("OVERRIDE_STATUS");
        }
        return actions;
    }
    /**
     * Generate 6-digit OTP
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
}
exports.OrderService = OrderService;
