import { HydratedDocument, Schema, model, Types } from "mongoose";

export interface IAppSettings {
  key: "GLOBAL";
  paymentsEnabled: boolean;
  paymentsDisabledMessage: string;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceGraceSeconds: number;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

export type AppSettingsDocument = HydratedDocument<IAppSettings>;

const appSettingsSchema = new Schema<IAppSettings>(
  {
    key: {
      type: String,
      enum: ["GLOBAL"],
      required: true,
      unique: true,
      default: "GLOBAL",
    },
    paymentsEnabled: {
      type: Boolean,
      default: true,
    },
    paymentsDisabledMessage: {
      type: String,
      default: "Online payments are temporarily unavailable. Please contact seller or try later.",
      trim: true,
    },
    maintenanceEnabled: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default:
        "We're currently performing scheduled maintenance to improve your experience. The site will be back shortly. Thank you for your patience.",
      trim: true,
    },
    maintenanceGraceSeconds: {
      type: Number,
      default: 60,
      min: 10,
      max: 600,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

const AppSettings = model<IAppSettings>("AppSettings", appSettingsSchema);

export default AppSettings;