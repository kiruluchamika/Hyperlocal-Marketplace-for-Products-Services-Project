import User from "../models/User";
import { AppError } from "../utils/AppError";

export const getUserById = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
};

export const listUsers = async () => {
  return User.find();
};
