import mongoose, { Schema, Document, Model } from "mongoose";

export type ServiceBookingStatus =
  | "PENDING"
  | "PROVIDER_ACCEPTED"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED";

export interface IServiceBooking extends Document {
  serviceId: mongoose.Types.ObjectId;

  buyerId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;

  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  note?: string;

  status: ServiceBookingStatus;

  deposit?: {
    amount: number;
    currency: string;
    stripePaymentIntentId?: string;
    paidAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;

  isSlotTaken?: boolean;
}

const serviceBookingSchema = new Schema<IServiceBooking>(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "ServiceSelling", required: true },

    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    note: { type: String, trim: true, maxlength: 1000 },

    status: {
      type: String,
      enum: ["PENDING", "PROVIDER_ACCEPTED", "CONFIRMED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },

    deposit: {
      amount: { type: Number, min: 0 },
      currency: { type: String, default: "lkr" },
      stripePaymentIntentId: { type: String },
      paidAt: { type: Date },
    },
  },
  { timestamps: true }
);

// For slot queries
serviceBookingSchema.index({ serviceId: 1, status: 1, startAt: 1 });
serviceBookingSchema.index({ providerId: 1, startAt: 1 });

const ServiceBooking: Model<IServiceBooking> = mongoose.model<IServiceBooking>(
  "ServiceBooking",
  serviceBookingSchema
);

export default ServiceBooking;