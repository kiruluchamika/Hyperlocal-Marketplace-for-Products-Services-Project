import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

type Role = "admin" | "user";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  age: number;
  address: {
    street?: string;
    city: string;
    province?: string;
    postalCode?: string;
    country: string;
  };
  profileImage?: string;
  bio?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const signToken = (userId: string, role: Role): string => {
  const payload = { role };
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
    subject: userId
  } as SignOptions);
  return token;
};

const sanitizeUser = (user: any) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  age: user.age,
  address: user.address,
  profileImage: user.profileImage,
  bio: user.bio
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
    role: "user",
    phone: input.phone,
    age: input.age,
    address: input.address,
    profileImage: input.profileImage,
    bio: input.bio
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
