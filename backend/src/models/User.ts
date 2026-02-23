import mongoose, { Schema, Document, Model } from "mongoose";

type Role = "admin" | "user";

interface IAddress {
  street?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone: string;
  age: number;
  address: IAddress;
  profileImage?: string;
  bio?: string;
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
    profileImage: { type: String },
    bio: { type: String, maxlength: 500, trim: true }
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
