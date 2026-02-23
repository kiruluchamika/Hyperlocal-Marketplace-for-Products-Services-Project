import mongoose, { Schema, Document, Model } from "mongoose";

export type PricingType = "FIXED" | "HOURLY";

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
  isActive: boolean;

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

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ServiceSelling: Model<IServiceSelling> = mongoose.model<IServiceSelling>(
  "ServiceSelling",
  serviceSellingSchema
);

export default ServiceSelling;
