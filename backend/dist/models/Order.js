"use strict";
/**
 * Order Model
 *
 * Manages the complete order lifecycle for product purchases.
 *
 * LIFECYCLE:
 * PENDING → Buyer creates order, awaits seller acceptance
 * ACCEPTED → Seller accepts, order in preparation
 * REJECTED → Seller rejects (payment refunded)
 * IN_PROGRESS → Seller starts delivery/preparation
 * COMPLETED → Delivery confirmed, payment released
 * CANCELLED → Buyer cancels before acceptance (payment refunded)
 *
 * SNAPSHOT PATTERN:
 * Stores title and price at time of order to maintain historical accuracy
 * even if listing is modified or deleted later.
 *
 * OTP DELIVERY (Optional):
 * When enabled, generates 6-digit OTP that buyer shares with seller
 * to confirm physical delivery. Prevents fraud.
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
exports.DeliveryMethod = exports.OrderStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["ACCEPTED"] = "ACCEPTED";
    OrderStatus["REJECTED"] = "REJECTED";
    OrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["CANCELLED"] = "CANCELLED"; // Buyer cancelled
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var DeliveryMethod;
(function (DeliveryMethod) {
    DeliveryMethod["PICKUP"] = "PICKUP";
    DeliveryMethod["DELIVERY"] = "DELIVERY"; // Seller delivers to buyer
})(DeliveryMethod || (exports.DeliveryMethod = DeliveryMethod = {}));
const orderSchema = new mongoose_1.Schema({
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
    listingId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
        index: true
    },
    titleSnapshot: {
        type: String,
        required: true,
        trim: true
    },
    unitPriceSnapshot: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryMethod: {
        type: String,
        enum: Object.values(DeliveryMethod),
        required: true
    },
    deliveryAddress: {
        type: String,
        trim: true,
        // Required if deliveryMethod is DELIVERY (validated in service layer)
    },
    note: {
        type: String,
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.PENDING,
        required: true,
        index: true
    },
    paymentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Payment",
        index: true
    },
    // OTP fields
    deliveryOtpHash: {
        type: String,
        select: false // Never return in queries by default
    },
    deliveryOtpExpiresAt: {
        type: Date
    },
    deliveryOtpAttempts: {
        type: Number,
        default: 0,
        min: 0
    },
    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date
    }
}, {
    timestamps: true,
    collection: "orders"
});
// Compound indexes for common queries
orderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ listingId: 1, createdAt: -1 });
orderSchema.index({ isDeleted: 1, createdAt: -1 });
// Virtual for OTP (generated, not stored)
orderSchema.virtual("deliveryOtp").get(function () {
    // This is only used for display purposes, actual OTP is hashed
    return undefined;
});
// Pre-save validation
orderSchema.pre("save", function (next) {
    // Validate delivery address required for DELIVERY method
    if (this.deliveryMethod === DeliveryMethod.DELIVERY && !this.deliveryAddress) {
        return next(new Error("Delivery address is required for DELIVERY method"));
    }
    // Calculate total if not set
    if (!this.totalAmount || this.totalAmount === 0) {
        this.totalAmount = this.unitPriceSnapshot * this.quantity;
    }
    next();
});
// Instance methods
orderSchema.methods.toJSON = function () {
    const order = this.toObject();
    order.id = order._id.toString();
    delete order._id;
    delete order.__v;
    delete order.deliveryOtpHash; // Never expose hash
    delete order.isDeleted;
    delete order.deletedAt;
    return order;
};
// Static method to find non-deleted orders
orderSchema.statics.findActive = function (query = {}) {
    return this.find({ ...query, isDeleted: false });
};
// Query middleware: Exclude soft-deleted by default
orderSchema.pre(/^find/, function (next) {
    // Only apply if not explicitly querying deleted items
    // @ts-ignore - this is a Query in pre-find hooks
    const query = this.getQuery();
    if (query.isDeleted === undefined) {
        // @ts-ignore
        this.where({ isDeleted: false });
    }
    next();
});
const Order = mongoose_1.default.model("Order", orderSchema);
exports.default = Order;
