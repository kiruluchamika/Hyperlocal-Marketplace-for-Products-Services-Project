import mongoose, { Schema, Document, Model } from "mongoose";

type Role = "admin" | "user";
type KycStatus = "UNSUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";

interface IAddress {
  street?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
}

interface IUserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

interface IUserVerification {
  kycStatus: KycStatus;
  kycSubmittedAt?: Date;
  kycReviewedAt?: Date;
}

interface ISellerProfile {
  businessName?: string;
  serviceArea?: string;
  description?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone: string;
  age: number;
  address: IAddress;
  googleId?: string;
  emailVerified: boolean;
  isProfileComplete: boolean;
  profileImage?: string;
  bio?: string;
  verification: IUserVerification;
  preferences: IUserPreferences;
  sellerProfile?: ISellerProfile;
  isActive: boolean;
  suspendedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>({
  street: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  province: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  country: { type: String, required: true, trim: true, default: "Sri Lanka" }
}, { _id: false });

const verificationSchema = new Schema<IUserVerification>(
  {
    kycStatus: {
      type: String,
      enum: ["UNSUBMITTED", "PENDING", "VERIFIED", "REJECTED"],
      default: "UNSUBMITTED"
    },
    kycSubmittedAt: { type: Date },
    kycReviewedAt: { type: Date }
  },
  { _id: false }
);

const preferencesSchema = new Schema<IUserPreferences>(
  {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false }
  },
  { _id: false }
);

const sellerProfileSchema = new Schema<ISellerProfile>(
  {
    businessName: { type: String, trim: true },
    serviceArea: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 500 }
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user"
    },
    phone: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 18, max: 120 },
    address: { type: addressSchema, required: true },
    googleId: { type: String, unique: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    isProfileComplete: { type: Boolean, default: true },
    profileImage: { type: String },
    bio: { type: String, maxlength: 500, trim: true },
    verification: { type: verificationSchema, default: () => ({}) },
    preferences: { type: preferencesSchema, default: () => ({}) },
    sellerProfile: { type: sellerProfileSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
    suspendedAt: { type: Date }
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
