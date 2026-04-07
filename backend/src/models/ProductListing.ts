import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ProductListingType = "PRODUCT";
export type TransactionMode = "BUY_NOW" | "NEGOTIABLE";
export type ListingCondition = "NEW" | "USED_LIKE_NEW" | "USED_GOOD" | "USED_FAIR";
export type ListingStatus = "ACTIVE" | "SOLD" | "HIDDEN" | "DELETED" | "SUSPENDED" | "UNDER_REVIEW";

interface ILocation {
  city: string;
  address?: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface IProductListing extends Document {
  ownerId: Types.ObjectId;
  type: ProductListingType;
  transactionMode: TransactionMode;
  title: string;
  description: string;
  categoryId: Types.ObjectId;
  attributes: Record<string, string | number | boolean>;
  price: number;
  currency: string;
  isNegotiable: boolean;
  condition: ListingCondition;
  images: string[];
  location: ILocation;
  status: ListingStatus;
  tags: string[];
  viewsCount: number;
  viewedByUserIds: Types.ObjectId[];
  savedCount: number;
  createdAt: Date;
  updatedAt: Date;
  suspendReason?: string;
  suspendDeadline?: Date;
}

const productListingSchema = new Schema<IProductListing>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["PRODUCT"],
      default: "PRODUCT",
      required: true
    },
    transactionMode: {
      type: String,
      enum: ["BUY_NOW", "NEGOTIABLE"],
      default: "BUY_NOW",
      required: true
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
    currency: { type: String, required: true, trim: true, uppercase: true, default: "LKR" },
    isNegotiable: { type: Boolean, default: false },
    condition: {
      type: String,
      enum: ["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"],
      required: true,
      default: "USED_GOOD"
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (urls: string[]) => urls.length >= 1 && urls.length <= 10,
        message: "images must contain between 1 and 10 URLs"
      }
    },
    location: {
      city: { type: String, required: true, trim: true, index: true },
      address: { type: String, trim: true },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          required: true,
          default: "Point"
        },
        coordinates: {
          type: [Number],
          required: true,
          validate: {
            validator: (value: number[]) => value.length === 2,
            message: "coordinates must be [lng, lat]"
          }
        }
      }
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SOLD", "HIDDEN", "DELETED", "SUSPENDED", "UNDER_REVIEW"],
      default: "ACTIVE",
      index: true
    },
    suspendReason: { type: String, trim: true },
    suspendDeadline: { type: Date, index: true },
    tags: { type: [String], default: [] },
    viewsCount: { type: Number, default: 0, min: 0 },
    viewedByUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
      select: false
    },
    savedCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

productListingSchema.index({ title: "text", description: "text" });
productListingSchema.index({ "location.coordinates": "2dsphere" });

const ProductListing: Model<IProductListing> = mongoose.model<IProductListing>(
  "ProductListing",
  productListingSchema
);

export default ProductListing;
