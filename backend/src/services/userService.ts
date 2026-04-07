import User from "../models/User";
import { AppError } from "../utils/AppError";
import ProductListing from "../models/ProductListing";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { StripeConnectService } from "./stripeConnectService";

interface UpdateProfileInput {
  name?: string;
  phone?: string;
  age?: number;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  profileImage?: string | null;
  bio?: string;
  sellerProfile?: {
    businessName?: string;
    serviceArea?: string;
    description?: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    marketingEmails?: boolean;
  };
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const sanitizeUserProfile = (user: any) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  age: user.age,
  address: user.address,
  googleId: user.googleId,
  emailVerified: user.emailVerified,
  isProfileComplete: user.isProfileComplete,
  profileImage: user.profileImage,
  bio: user.bio,
  verification: user.verification,
  stripeConnect: user.stripeConnect,
  preferences: user.preferences,
  sellerProfile: user.sellerProfile,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const stripeConnectService = new StripeConnectService();

const computeProfileCompleteness = (user: any) => {
  return Boolean(
    user.name?.trim() &&
      user.phone?.trim() &&
      user.phone !== "SOCIAL_PENDING" &&
      typeof user.age === "number" &&
      user.age >= 18 &&
      user.address?.city?.trim() &&
      user.address?.country?.trim()
  );
};

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

export const updateUserProfile = async (userId: string, payload: UpdateProfileInput) => {
  const user = await getUserById(userId);

  if (payload.name !== undefined) user.name = payload.name;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.age !== undefined) user.age = payload.age;
  if (payload.profileImage !== undefined) {
    user.profileImage = payload.profileImage || undefined;
  }
  if (payload.bio !== undefined) user.bio = payload.bio;

  if (payload.address) {
    user.address = {
      ...user.address,
      ...payload.address
    };
  }

  if (payload.sellerProfile) {
    user.sellerProfile = {
      ...user.sellerProfile,
      ...payload.sellerProfile
    };
  }

  if (payload.preferences) {
    user.preferences = {
      ...user.preferences,
      ...payload.preferences
    };
  }

  user.isProfileComplete = computeProfileCompleteness(user);
  await user.save();

  return user;
};

export const changeUserPassword = async (userId: string, payload: ChangePasswordInput) => {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const matched = await bcrypt.compare(payload.currentPassword, user.password);
  if (!matched) {
    throw new AppError("Current password is incorrect", 400);
  }

  user.password = await bcrypt.hash(payload.newPassword, 10);
  await user.save();
};

/**
 * Check if user has created any listings (active seller detection)
 * Returns true if user has at least one non-deleted listing
 * 
 * Used for dynamic UI features - show seller dashboard when user creates first listing
 */
export const hasCreatedListings = async (userId: string): Promise<boolean> => {
  const count = await ProductListing.countDocuments({
    ownerId: new Types.ObjectId(userId),
    status: { $ne: "DELETED" }
  });
  return count > 0;
};

/**
 * Get detailed listing statistics for a user
 * Useful for seller dashboard and profile display
 */
export const getUserListingStats = async (userId: string) => {
  const [active, sold, hidden, total] = await Promise.all([
    ProductListing.countDocuments({
      ownerId: new Types.ObjectId(userId),
      status: "ACTIVE"
    }),
    ProductListing.countDocuments({
      ownerId: new Types.ObjectId(userId),
      status: "SOLD"
    }),
    ProductListing.countDocuments({
      ownerId: new Types.ObjectId(userId),
      status: "HIDDEN"
    }),
    ProductListing.countDocuments({
      ownerId: new Types.ObjectId(userId),
      status: { $in: ["ACTIVE", "SOLD", "HIDDEN"] }
    })
  ]);

  return {
    hasListings: total > 0,
    active,
    sold,
    hidden,
    total
  };
};

/**
 * Check if user is an active seller (has active or sold listings)
 * More strict than hasCreatedListings - only counts listings with market activity
 */
export const isActiveSeller = async (userId: string): Promise<boolean> => {
  const count = await ProductListing.countDocuments({
    ownerId: new Types.ObjectId(userId),
    status: { $in: ["ACTIVE", "SOLD"] }
  });
  return count > 0;
};

export const createStripeConnectOnboardingLink = async (args: {
  userId: string;
  returnUrl?: string;
  refreshUrl?: string;
}) => {
  return stripeConnectService.createOnboardingLink(args);
};

export const getStripeConnectStatusForUser = async (userId: string) => {
  return stripeConnectService.getUserConnectStatus(userId);
};

export const getStripeConnectBalanceForUser = async (userId: string) => {
  return stripeConnectService.getUserConnectBalance(userId);
};
