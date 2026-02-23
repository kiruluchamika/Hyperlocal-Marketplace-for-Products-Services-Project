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

import mongoose, { Schema, Document, Model } from "mongoose";

export enum OrderStatus {
  PENDING = "PENDING",           // Order created, awaiting seller action
  ACCEPTED = "ACCEPTED",         // Seller accepted, preparing order
  REJECTED = "REJECTED",         // Seller rejected
  IN_PROGRESS = "IN_PROGRESS",   // Order being prepared/delivered
  COMPLETED = "COMPLETED",       // Delivery confirmed
  CANCELLED = "CANCELLED"        // Buyer cancelled
}

export enum DeliveryMethod {
  PICKUP = "PICKUP",             // Buyer picks up from seller
  DELIVERY = "DELIVERY"          // Seller delivers to buyer
}

export interface IOrder extends Document {
  // Parties
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  
  // Snapshot data (captured at order time)
  titleSnapshot: string;
  unitPriceSnapshot: number;
  
  // Order details
  quantity: number;
  totalAmount: number;
  
  // Delivery
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;     // Required if DELIVERY method
  pickupLocationSnapshot?: string; // Captured from listing if PICKUP method
  
  // Optional note from buyer
  note?: string;
  
  // Status
  status: OrderStatus;
  
  // Payment reference
  paymentId?: mongoose.Types.ObjectId;
  
  // OTP Delivery Confirmation (optional feature)
  deliveryOtp?: string;           // Hashed OTP (not sent to client)
  deliveryOtpHash?: string;       // bcrypt hash
  deliveryOtpExpiresAt?: Date;
  deliveryOtpAttempts?: number;
  
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    listingId: {
      type: Schema.Types.ObjectId,
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
    pickupLocationSnapshot: {
      type: String,
      trim: true,
      // Captured from listing if deliveryMethod is PICKUP
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
      type: Schema.Types.ObjectId,
      ref: "Payment",
      index: true
    },
    // OTP fields
    deliveryOtpHash: {
      type: String,
      select: false  // Never return in queries by default
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
  },
  {
    timestamps: true,
    collection: "orders"
  }
);

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
  delete order.deliveryOtpHash;  // Never expose hash
  delete order.isDeleted;
  delete order.deletedAt;
  return order;
};

// Static method to find non-deleted orders
orderSchema.statics.findActive = function (query: any = {}) {
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

const Order: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
