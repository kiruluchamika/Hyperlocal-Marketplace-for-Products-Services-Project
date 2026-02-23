import mongoose, { Schema, Document, Model } from "mongoose";

type Role = "admin" | "user";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user"
    }
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
