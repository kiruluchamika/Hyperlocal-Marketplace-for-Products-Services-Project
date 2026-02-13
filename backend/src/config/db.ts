import mongoose from "mongoose";
import { env } from "./env";

export const connectDb = async () => {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");
};
