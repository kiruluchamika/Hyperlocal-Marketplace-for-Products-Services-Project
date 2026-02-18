import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ListingType = "PRODUCT";
export type TransactionMode = "BUY_NOW" | "NEGOTIABLE";
export type ListingCondition = "NEW" | "USED_LIKE_NEW" | "USED_GOOD" | "USED_FAIR";
export type ListingStatus = "ACTIVE" | "SOLD" | "HIDDEN" | "DELETED";

interface ILocation {
  city: string;
  address?: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface IListing extends Document {
  ownerId: Types.ObjectId;
  type: ListingType;
  transactionMode: TransactionMode;
  title: string;
  description: string;
  categoryId: string;
  price: number;
  currency: string;
  isNegotiable: boolean;
  condition: ListingCondition;
  images: string[];
  location: ILocation;
  status: ListingStatus;
  tags: string[];
  viewsCount: number;
  savedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>(
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
    categoryId: { type: String, required: true, trim: true, index: true },
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
      enum: ["ACTIVE", "SOLD", "HIDDEN", "DELETED"],
      default: "ACTIVE",
      index: true
    },
    tags: { type: [String], default: [] },
    viewsCount: { type: Number, default: 0, min: 0 },
    savedCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

listingSchema.index({ title: "text", description: "text" });
listingSchema.index({ "location.coordinates": "2dsphere" });

const Listing: Model<IListing> = mongoose.model<IListing>("Listing", listingSchema);

export default Listing;
