import mongoose, { Schema, Document, Model } from "mongoose";

export type WebsiteReviewStatus = "PUBLISHED" | "HIDDEN";

export interface IWebsiteReview extends Document {
  reviewerId: mongoose.Types.ObjectId;
  rating: number;
  title?: string;
  content: string;
  status: WebsiteReviewStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  hiddenReason?: string;
  hiddenBy?: mongoose.Types.ObjectId;
  hiddenAt?: Date;
  helpfulCount: number;
  helpfulVoterIds: mongoose.Types.ObjectId[];
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const websiteReviewSchema = new Schema<IWebsiteReview>(
  {
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulVoterIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    editedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

websiteReviewSchema.index({ status: 1, createdAt: -1 });
websiteReviewSchema.index({ reviewerId: 1, isDeleted: 1 });

const WebsiteReview: Model<IWebsiteReview> = mongoose.model<IWebsiteReview>("WebsiteReview", websiteReviewSchema);

export default WebsiteReview;
