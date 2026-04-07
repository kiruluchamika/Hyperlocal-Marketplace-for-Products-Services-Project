import mongoose, { Schema, Document, Model, ObjectId } from "mongoose";

type TargetType = "LISTING" | "SERVICE" | "USER";
type ReportReason = "SPAM" | "FRAUD" | "INAPPROPRIATE_CONTENT" | "HARASSMENT" | "DUPLICATE" | "OTHER";
type ReportStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";

export interface IReport extends Document {
  targetType: TargetType;
  targetId: ObjectId;
  reporterId: ObjectId;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  adminNotes?: string;
  resolvedBy?: ObjectId;
  resolvedAt?: Date;
  actionTaken?: "SUSPENDED" | "WARNING_SENT" | "NONE";
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    targetType: {
      type: String,
      enum: ["LISTING", "SERVICE", "USER"],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ["SPAM", "FRAUD", "INAPPROPRIATE_CONTENT", "HARASSMENT", "DUPLICATE", "OTHER"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"],
      default: "OPEN",
      index: true,
    },
    adminNotes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: Date,
    actionTaken: {
      type: String,
      enum: ["SUSPENDED", "WARNING_SENT", "NONE"],
    },
  },
  { timestamps: true }
);

// Compound index to help detect duplicate reports and for efficient querying
reportSchema.index({ targetType: 1, targetId: 1, reporterId: 1 });
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });
reportSchema.index({ createdAt: 1 });

const Report: Model<IReport> = mongoose.model<IReport>("Report", reportSchema);

export default Report;
