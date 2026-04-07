import mongoose, { Schema, Document, Model } from "mongoose";

export type ReviewStatus = "PUBLISHED" | "HIDDEN";
export type ReviewSource = "PUBLIC" | "BOOKING";

interface ISellerResponse {
  content: string;
  respondedAt: Date;
}

export interface IReview extends Document {
  serviceId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  source: ReviewSource;
  rating: number;
  title?: string;
  content: string;
  status: ReviewStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  trustScore: number;
  spamScore: number;
  helpfulCount: number;
  helpfulVoterIds: mongoose.Types.ObjectId[];
  hiddenReason?: string;
  hiddenBy?: mongoose.Types.ObjectId;
  hiddenAt?: Date;
  sellerResponse?: ISellerResponse;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sellerResponseSchema = new Schema<ISellerResponse>(
  {
    content: { type: String, trim: true, maxlength: 1000, required: true },
    respondedAt: { type: Date, required: true },
  },
  { _id: false }
);

const reviewSchema = new Schema<IReview>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceSelling",
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceBooking",
      index: true,
    },
    source: {
      type: String,
      enum: ["PUBLIC", "BOOKING"],
      default: "PUBLIC",
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    content: {
      type: String,
      trim: true,
      required: true,
      minlength: 10,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["PUBLISHED", "HIDDEN"],
      default: "PUBLISHED",
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    trustScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    spamScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulVoterIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    hiddenReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    hiddenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    hiddenAt: {
      type: Date,
    },
    sellerResponse: {
      type: sellerResponseSchema,
      required: false,
    },
    editedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ serviceId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ serviceId: 1, reviewerId: 1, isDeleted: 1 });
reviewSchema.index({ bookingId: 1, isDeleted: 1 });

const Review: Model<IReview> = mongoose.model<IReview>("Review", reviewSchema);

export default Review;
