import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ServicePricingType = "FIXED" | "HOURLY";

export interface IServiceListing extends Document {
  sellerId: Types.ObjectId;
  title: string;
  description: string;
  categoryId: Types.ObjectId;
  attributes: Record<string, string | number | boolean>;
  price: number;
  pricingType: ServicePricingType;
  currency: "LKR";
  locationText: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceListingSchema = new Schema<IServiceListing>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },
    attributes: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    },
    price: { type: Number, required: true, min: 0, index: true },
    pricingType: {
      type: String,
      enum: ["FIXED", "HOURLY"],
      required: true,
      default: "FIXED"
    },
    currency: {
      type: String,
      enum: ["LKR"],
      default: "LKR",
      required: true
    },
    locationText: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: (value: number[]) => value.length === 2,
          message: "coordinates must be [lng, lat]"
        }
      }
    },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

serviceListingSchema.index({ title: "text", description: "text" });
serviceListingSchema.index({ "location.coordinates": "2dsphere" });

const ServiceListing: Model<IServiceListing> = mongoose.model<IServiceListing>(
  "ServiceListing",
  serviceListingSchema
);

export default ServiceListing;
