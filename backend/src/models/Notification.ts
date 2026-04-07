/**
 * Notification Model
 * 
 * Stores system-wide notifications for users and admins.
 * 
 * RECIPIENT TYPES:
 * - USER: Notification sent to a specific user (recipientUserId required)
 * - ADMIN_BROADCAST: Notification sent to all admins
 * 
 * NOTIFICATION TYPES:
 * - ORDER: Related to order lifecycle events
 * - PAYMENT: Related to payment processing
 * - LISTING: Related to product/service listings
 * - USER: Related to user account events
 * - CATEGORY: Related to category changes
 * - SYSTEM: General system notifications
 * 
 * ENTITY TRACKING:
 * - entityType: The collection name (optional)
 * - entityId: The document ID (optional)
 * Allows UI to link notifications to relevant resources
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export enum RecipientType {
  USER = "USER",
  ADMIN_BROADCAST = "ADMIN_BROADCAST"
}

export enum NotificationType {
  ORDER = "ORDER",
  PAYMENT = "PAYMENT",
  LISTING = "LISTING",
  REVIEW = "REVIEW",
  USER = "USER",
  CATEGORY = "CATEGORY",
  SYSTEM = "SYSTEM",
  REPORT = "REPORT"
}

export interface INotification extends Document {
  recipientType: RecipientType;
  recipientUserId?: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId | string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientType: {
      type: String,
      enum: Object.values(RecipientType),
      required: true,
      index: true
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true
    },
    entityType: {
      type: String,
      trim: true
    },
    entityId: {
      type: Schema.Types.Mixed
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

export default Notification;
