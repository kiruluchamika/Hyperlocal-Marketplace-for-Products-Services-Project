import User from "../models/User";
import { AppError } from "../utils/AppError";
import ProductListing from "../models/ProductListing";
import { Types } from "mongoose";

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
