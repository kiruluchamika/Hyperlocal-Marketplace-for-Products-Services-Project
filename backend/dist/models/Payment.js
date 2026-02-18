"use strict";
/**
 * Payment Model
 *
 * Tracks payment transactions and escrow status for orders.
 *
 * ESCROW LOGIC:
 * - INITIATED: Payment created, waiting for Stripe confirmation
 * - HELD: Payment successful, money held in escrow until delivery
 * - RELEASED: Order completed, payment released to seller
 * - REFUNDED: Order cancelled/rejected, payment refunded to buyer
 * - FAILED: Payment failed at Stripe
 *
 * This simulates escrow without actual fund holding - in production,
 * you'd use Stripe Connect with separate accounts for marketplace & sellers.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["INITIATED"] = "INITIATED";
    PaymentStatus["HELD"] = "HELD";
    PaymentStatus["RELEASED"] = "RELEASED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["FAILED"] = "FAILED"; // Payment failed
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
const paymentSchema = new mongoose_1.Schema({
    orderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        index: true
    },
    buyerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    sellerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    provider: {
        type: String,
        enum: ["STRIPE"],
        default: "STRIPE",
        required: true
    },
    providerPaymentId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        uppercase: true,
        default: "LKR"
    },
    status: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.INITIATED,
        required: true,
        index: true
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    collection: "payments"
});
// Indexes for common queries
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ buyerId: 1, createdAt: -1 });
paymentSchema.index({ sellerId: 1, status: 1 });
// Instance methods
paymentSchema.methods.toJSON = function () {
    const payment = this.toObject();
    payment.id = payment._id.toString();
    delete payment._id;
    delete payment.__v;
    return payment;
};
const Payment = mongoose_1.default.model("Payment", paymentSchema);
exports.default = Payment;
