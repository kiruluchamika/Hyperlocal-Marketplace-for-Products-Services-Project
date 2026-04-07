import mongoose, { Schema, Document, Model } from "mongoose";

export type PricingType = "FIXED" | "HOURLY";
export type ServiceSellingStatus = "ACTIVE" | "REMOVED" | "DELETED";

/**
 * ✅ NEW: Geo location structure (same style as ProductListing)
 */
interface ILocation {
  city: string;
  address?: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface IServiceSelling extends Document {
  title: string;
  description: string;

  categoryId: mongoose.Types.ObjectId;
  price: number;
  pricingType: PricingType;

  // ✅ keep existing field (so old API stays working)
  locationText: string;

  // ✅ NEW: proper geo location for geo-search
  location?: ILocation;

  images: string[];
  viewsCount: number;
  viewedByUserIds: mongoose.Types.ObjectId[];

  attributeValues: Record<string, unknown>;

  sellerId: mongoose.Types.ObjectId;

  averageRating: number;
  reviewCount: number;
  ratingBreakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };

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
    description: { type: String, trim: true, maxlength: 2000, default: "" },

    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },

    price: { type: Number, required: true, min: 0 },
    pricingType: { type: String, enum: ["FIXED", "HOURLY"], required: true },

    // ✅ keep old field
    locationText: { type: String, required: true, trim: true, maxlength: 120 },

    // ✅ NEW geo field (optional so old records don't break)
    location: {
      city: { type: String, trim: true, index: true },
      address: { type: String, trim: true },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          validate: {
            validator: (value: number[]) => !value || value.length === 2,
            message: "coordinates must be [lng, lat]",
          },
        },
      },
    },

    images: { type: [String], default: [] },
    viewsCount: { type: Number, default: 0, min: 0 },
    viewedByUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
      select: false,
    },

    attributeValues: { type: Schema.Types.Mixed, default: {} },

    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    ratingBreakdown: {
      1: { type: Number, default: 0, min: 0 },
      2: { type: Number, default: 0, min: 0 },
      3: { type: Number, default: 0, min: 0 },
      4: { type: Number, default: 0, min: 0 },
      5: { type: Number, default: 0, min: 0 },
    },

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

/**
 * ✅ NEW: geo index (required for geo queries)
 * This matches your geoService query: "location.coordinates"
 */
serviceSellingSchema.index({ "location.coordinates": "2dsphere" });

const ServiceSelling: Model<IServiceSelling> = mongoose.model<IServiceSelling>(
  "ServiceSelling",
  serviceSellingSchema
);

export default ServiceSelling;
