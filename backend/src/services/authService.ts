import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

type Role = "admin" | "seller" | "buyer";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

interface LoginInput {
  email: string;
  password: string;
}

const signToken = (userId: string, role: Role) => {
  return jwt.sign({ role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    subject: userId
  });
};

const sanitizeUser = (user: any) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role
});

export const registerUser = async (input: RegisterInput) => {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new AppError("Email already in use", 409);
  }

  const hashed = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    name: input.name,
    email: input.email,
    password: hashed,
    role: input.role ?? "buyer"
  });

  const token = signToken(user.id, user.role as Role);
  return { user: sanitizeUser(user), token };
};

export const loginUser = async (input: LoginInput) => {
  const user = await User.findOne({ email: input.email }).select("+password");
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const matched = await bcrypt.compare(input.password, user.password);
  if (!matched) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = signToken(user.id, user.role as Role);
  return { user: sanitizeUser(user), token };
};
