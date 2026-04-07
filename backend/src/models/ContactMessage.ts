import mongoose, { Schema, Document, Model } from "mongoose";

export enum ContactMessageStatus {
  PENDING = "PENDING",
  REVIEWED_NO_REPLY = "REVIEWED_NO_REPLY",
  REPLIED = "REPLIED"
}

export interface IContactMessage extends Document {
  senderUserId?: mongoose.Types.ObjectId;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  senderWhatsapp?: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  adminReplyMessage?: string;
  adminRepliedBy?: mongoose.Types.ObjectId;
  repliedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    senderUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    senderEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
      index: true
    },
    senderPhone: {
      type: String,
      trim: true,
      maxlength: 30
    },
    senderWhatsapp: {
      type: String,
      trim: true,
      maxlength: 30
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    status: {
      type: String,
      enum: Object.values(ContactMessageStatus),
      default: ContactMessageStatus.PENDING,
      index: true
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    reviewedAt: {
      type: Date
    },
    adminReplyMessage: {
      type: String,
      trim: true,
      maxlength: 5000
    },
    adminRepliedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    repliedAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ senderUserId: 1, createdAt: -1 });

const ContactMessage: Model<IContactMessage> = mongoose.model<IContactMessage>(
  "ContactMessage",
  contactMessageSchema
);

export default ContactMessage;
