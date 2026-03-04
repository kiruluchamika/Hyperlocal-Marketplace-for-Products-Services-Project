import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import { sanitizeUserProfile } from "./userService";

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

interface GoogleSocialLoginInput {
  idToken: string;
}

const getGoogleClientId = () => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError("Google social login is not configured", 500);
  }
  return env.GOOGLE_CLIENT_ID;
};

const googleClient = new OAuth2Client();

const signToken = (userId: string, role: Role): string => {
  const payload = { role };
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
    subject: userId
  } as SignOptions);
  return token;
};

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
  return { user: sanitizeUserProfile(user), token };
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
  return { user: sanitizeUserProfile(user), token };
};

export const loginAdmin = async (input: LoginInput) => {
  const user = await User.findOne({ email: input.email }).select("+password");
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const matched = await bcrypt.compare(input.password, user.password);
  if (!matched) {
    throw new AppError("Invalid credentials", 401);
  }

  if (user.role !== "admin") {
    throw new AppError("Admin access required", 403);
  }

  const token = signToken(user.id, user.role as Role);
  return { user: sanitizeUserProfile(user), token };
};

export const loginWithGoogle = async (input: GoogleSocialLoginInput) => {
  const clientId = getGoogleClientId();
  const ticket = await googleClient.verifyIdToken({
    idToken: input.idToken,
    audience: clientId
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new AppError("Google account email is not available", 400);
  }

  if (!payload.email_verified) {
    throw new AppError("Google email must be verified", 400);
  }

  const normalizedEmail = payload.email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const hashed = await bcrypt.hash(randomUUID(), 10);
    user = await User.create({
      name: payload.name || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      password: hashed,
      role: "user",
      phone: "SOCIAL_PENDING",
      age: 18,
      address: {
        city: "Pending",
        country: "Sri Lanka"
      },
      googleId: payload.sub,
      emailVerified: true,
      isProfileComplete: false,
      profileImage: payload.picture
    });
  } else {
    user.googleId = user.googleId || payload.sub;
    user.emailVerified = true;
    if (!user.profileImage && payload.picture) {
      user.profileImage = payload.picture;
    }
    await user.save();
  }

  const token = signToken(user.id, user.role as Role);
  return { user: sanitizeUserProfile(user), token };
};
