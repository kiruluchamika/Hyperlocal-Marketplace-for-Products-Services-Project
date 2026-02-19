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

import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentProvider = "STRIPE";

export enum PaymentStatus {
  INITIATED = "INITIATED",   // Payment intent created
  HELD = "HELD",             // Payment successful, in escrow
  RELEASED = "RELEASED",     // Payment released to seller
  REFUNDED = "REFUNDED",     // Payment refunded to buyer
  FAILED = "FAILED"          // Payment failed
}

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  
  // Provider details
  provider: PaymentProvider;
  providerPaymentId: string;  // Stripe PaymentIntent ID (pi_xxx)
  
  // Amount
  amount: number;             // Total amount in smallest currency unit (cents)
  currency: string;           // e.g., "LKR"
  
  // Status tracking
  status: PaymentStatus;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
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
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: "payments"
  }
);

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

const Payment: Model<IPayment> = mongoose.model<IPayment>(
  "Payment",
  paymentSchema
);

export default Payment;
