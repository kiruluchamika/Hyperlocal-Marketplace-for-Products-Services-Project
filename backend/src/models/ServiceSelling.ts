import mongoose, { Schema, Document, Model } from "mongoose";

export type PricingType = "FIXED" | "HOURLY";
export type ServiceSellingStatus = "ACTIVE" | "REMOVED" | "DELETED";

export interface IServiceSelling extends Document {
  title: string;
  description: string;

  categoryId: mongoose.Types.ObjectId;
  price: number;
  pricingType: PricingType;

  locationText: string;
  images: string[];

  attributeValues: Record<string, unknown>;

  sellerId: mongoose.Types.ObjectId;

  // Visibility / moderation
  status: ServiceSellingStatus;
  isActive: boolean; // kept for backward compatibility
  removedReason?: string;
  removedBy?: mongoose.Types.ObjectId;
  removedAt?: Date;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const serviceSellingSchema = new Schema<IServiceSelling>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },

    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },

    price: { type: Number, required: true, min: 0 },
    pricingType: { type: String, enum: ["FIXED", "HOURLY"], required: true },

    locationText: { type: String, required: true, trim: true, maxlength: 120 },

    images: { type: [String], default: [] },

    attributeValues: { type: Schema.Types.Mixed, default: {} },

    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    status: { type: String, enum: ["ACTIVE", "REMOVED", "DELETED"], default: "ACTIVE" },

    // Keep old flag so existing code doesn't break; status is the real source of truth
    isActive: { type: Boolean, default: true },

    removedReason: { type: String, trim: true, maxlength: 500 },
    removedBy: { type: Schema.Types.ObjectId, ref: "User" },
    removedAt: { type: Date },

    deletedAt: { type: Date },
  },
  { timestamps: true }
);

const ServiceSelling: Model<IServiceSelling> = mongoose.model<IServiceSelling>(
  "ServiceSelling",
  serviceSellingSchema
);

export default ServiceSelling;