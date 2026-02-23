/**
 * Listing Service
 * 
 * Implements business logic for product listing management with:
 * - Category validation and dynamic attribute enforcement
 * - Ownership-based access control (not role-based)
 * - Public visibility for ACTIVE listings only
 * - Owner/admin can view/modify all statuses
 */

import ProductListing from "../models/ProductListing";
import Category from "../models/Category";
import { AppError } from "../utils/AppError";
import { Types } from "mongoose";
import { hasCreatedListings as userHasListings } from "./userService";

interface CreateListingInput {
  type: "PRODUCT";
  transactionMode: "BUY_NOW" | "NEGOTIABLE";
  title: string;
  description: string;
  categoryId: string;
  attributes: Record<string, string | number | boolean>;
  price: number;
  currency: string;
  isNegotiable?: boolean;
  condition: "NEW" | "USED_LIKE_NEW" | "USED_GOOD" | "USED_FAIR";
  images: string[];
  location: {
    city: string;
    address?: string;
    coordinates: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  tags?: string[];
}

interface UpdateListingInput {
  transactionMode?: "BUY_NOW" | "NEGOTIABLE";
  title?: string;
  description?: string;
  categoryId?: string;
  attributes?: Record<string, string | number | boolean>;
  price?: number;
  currency?: string;
  isNegotiable?: boolean;
  condition?: "NEW" | "USED_LIKE_NEW" | "USED_GOOD" | "USED_FAIR";
  images?: string[];
  location?: {
    city: string;
    address?: string;
    coordinates: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  status?: "ACTIVE" | "SOLD" | "HIDDEN" | "DELETED";
  tags?: string[];
}

interface GetListingsQuery {
  categoryId?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  condition?: string;
  transactionMode?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

/**
 * Validate category exists, is active, and is of type PRODUCT
 */
const validateCategory = async (categoryId: string) => {
  const category = await Category.findById(categoryId);
  
  if (!category) {
    throw new AppError("Category not found", 404);
  }
  
  if (!category.isActive) {
    throw new AppError("Category is not active", 400);
  }
  
  if (category.type !== "PRODUCT") {
    throw new AppError("Only PRODUCT categories are allowed for product listings", 400);
  }
  
  return category;
};

/**
 * Validate submitted attributes match category schema
 */
const validateAttributes = (
  submittedAttrs: Record<string, any>,
  categoryAttrs: Array<{ fieldName: string; fieldType: string; required: boolean; options?: string[] }>
) => {
  // Check for unknown attributes
  const allowedFieldNames = new Set(categoryAttrs.map(a => a.fieldName));
  for (const key of Object.keys(submittedAttrs)) {
    if (!allowedFieldNames.has(key)) {
      throw new AppError(`Unknown attribute: ${key}. Category does not define this field.`, 400);
    }
  }
  
  // Check required attributes
  for (const attr of categoryAttrs) {
    if (attr.required && !(attr.fieldName in submittedAttrs)) {
      throw new AppError(`Required attribute missing: ${attr.fieldName}`, 400);
    }
  }
  
  // Type validation
  for (const attr of categoryAttrs) {
    const value = submittedAttrs[attr.fieldName];
    if (value === undefined) continue;
    
    switch (attr.fieldType) {
      case "string":
        if (typeof value !== "string") {
          throw new AppError(`Attribute ${attr.fieldName} must be a string`, 400);
        }
        // For select type, validate against options
        if (attr.options && attr.options.length > 0 && !attr.options.includes(value)) {
          throw new AppError(
            `Attribute ${attr.fieldName} must be one of: ${attr.options.join(", ")}`,
            400
          );
        }
        break;
      case "number":
        if (typeof value !== "number") {
          throw new AppError(`Attribute ${attr.fieldName} must be a number`, 400);
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          throw new AppError(`Attribute ${attr.fieldName} must be a boolean`, 400);
        }
        break;
      case "select":
        if (typeof value !== "string") {
          throw new AppError(`Attribute ${attr.fieldName} must be a string`, 400);
        }
        if (attr.options && !attr.options.includes(value)) {
          throw new AppError(
            `Attribute ${attr.fieldName} must be one of: ${attr.options.join(", ")}`,
            400
          );
        }
        break;
    }
  }
};

/**
 * Create a new product listing
 */
export const createListing = async (userId: string, data: CreateListingInput) => {
  // Validate category
  const category = await validateCategory(data.categoryId);
  
  // Validate attributes
  validateAttributes(data.attributes, category.attributes);
  
  // Create listing
  const listing = await ProductListing.create({
    ownerId: new Types.ObjectId(userId),
    type: "PRODUCT",
    transactionMode: data.transactionMode,
    title: data.title,
    description: data.description,
    categoryId: new Types.ObjectId(data.categoryId),
    attributes: data.attributes,
    price: data.price,
    currency: data.currency,
    isNegotiable: data.isNegotiable ?? (data.transactionMode === "NEGOTIABLE"),
    condition: data.condition,
    images: data.images,
    location: data.location,
    status: "ACTIVE",
    tags: data.tags || []
  });
  
  return listing;
};

/**
 * Get listings with filters (public feed)
 */
export const getListings = async (query: GetListingsQuery) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;
  
  // Build query
  const filter: any = { status: "ACTIVE" }; // Only show active listings publicly
  
  if (query.categoryId) {
    filter.categoryId = new Types.ObjectId(query.categoryId);
  }
  
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
  }
  
  if (query.city) {
    filter["location.city"] = new RegExp(query.city, "i");
  }
  
  if (query.condition) {
    filter.condition = query.condition;
  }
  
  if (query.transactionMode) {
    filter.transactionMode = query.transactionMode;
  }
  
  if (query.searchTerm) {
    filter.$text = { $search: query.searchTerm };
  }
  
  const [listings, total] = await Promise.all([
    ProductListing.find(filter)
      .populate("categoryId", "name type")
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ProductListing.countDocuments(filter)
  ]);
  
  return {
    listings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get single listing by ID with visibility controls
 * - Public users: only see ACTIVE listings
 * - Owner/admin: see all statuses
 */
export const getListingById = async (
  listingId: string,
  requesterId?: string,
  requesterRole?: string
) => {
  const listing = await ProductListing.findById(listingId)
    .populate("categoryId", "name type attributes")
    .populate("ownerId", "name email");
  
  if (!listing) {
    throw new AppError("Listing not found", 404);
  }
  
  // Check visibility
  const isOwner = requesterId && listing.ownerId._id.toString() === requesterId;
  const isAdmin = requesterRole === "admin";
  const isActive = listing.status === "ACTIVE";
  
  if (!isActive && !isOwner && !isAdmin) {
    throw new AppError("Listing not found", 404);
  }
  
  return listing;
};

/**
 * Update listing
 */
export const updateListing = async (
  listingId: string,
  userId: string,
  userRole: string,
  data: UpdateListingInput
) => {
  const listing = await ProductListing.findById(listingId);
  
  if (!listing) {
    throw new AppError("Listing not found", 404);
  }
  
  // Check ownership
  const isOwner = listing.ownerId.toString() === userId;
  const isAdmin = userRole === "admin";
  
  if (!isOwner && !isAdmin) {
    throw new AppError("You are not authorized to update this listing", 403);
  }
  
  // If category is being changed, validate it
  let category;
  if (data.categoryId) {
    category = await validateCategory(data.categoryId);
  } else {
    category = await Category.findById(listing.categoryId);
  }
  
  if (!category) {
    throw new AppError("Category not found", 404);
  }
  
  // If attributes are being updated, validate them
  if (data.attributes) {
    validateAttributes(data.attributes, category.attributes);
  }
  
  // Update fields
  if (data.transactionMode) listing.transactionMode = data.transactionMode;
  if (data.title) listing.title = data.title;
  if (data.description) listing.description = data.description;
  if (data.categoryId) listing.categoryId = new Types.ObjectId(data.categoryId);
  if (data.attributes) listing.attributes = data.attributes;
  if (data.price !== undefined) listing.price = data.price;
  if (data.currency) listing.currency = data.currency;
  if (data.isNegotiable !== undefined) listing.isNegotiable = data.isNegotiable;
  if (data.condition) listing.condition = data.condition;
  if (data.images) listing.images = data.images;
  if (data.location) listing.location = data.location;
  if (data.status) listing.status = data.status;
  if (data.tags) listing.tags = data.tags;
  
  await listing.save();
  
  return listing;
};

/**
 * Delete listing (soft delete - sets status to DELETED)
 */
export const deleteListing = async (
  listingId: string,
  userId: string,
  userRole: string
) => {
  const listing = await ProductListing.findById(listingId);
  
  if (!listing) {
    throw new AppError("Listing not found", 404);
  }
  
  // Check ownership
  const isOwner = listing.ownerId.toString() === userId;
  const isAdmin = userRole === "admin";
  
  if (!isOwner && !isAdmin) {
    throw new AppError("You are not authorized to delete this listing", 403);
  }
  
  listing.status = "DELETED";
  await listing.save();
  
  return { message: "Listing deleted successfully" };
};

/**
 * Check if user can modify a listing
 * Used by requireOwnershipOrAdmin middleware
 */
export const canModifyListing = async (
  listingId: string,
  userId: string,
  userRole: string
): Promise<boolean> => {
  // Admins can modify anything
  if (userRole === "admin") {
    return true;
  }
  
  // Check if listing exists and user is owner
  const listing = await ProductListing.findById(listingId);
  if (!listing) {
    throw new AppError("Listing not found", 404);
  }
  
  return listing.ownerId.toString() === userId;
};

/**
 * Check if user has created any listings
 * Alias to userService function for convenience
 */
export const hasUserCreatedListings = async (userId: string): Promise<boolean> => {
  return userHasListings(userId);
};
