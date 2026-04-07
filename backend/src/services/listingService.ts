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
    coordinates?: unknown;
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
    coordinates?: unknown;
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

type NormalizedCoordinates = {
  type: "Point";
  coordinates: [number, number];
};

type NormalizedLocation = {
  city: string;
  address?: string;
  coordinates: NormalizedCoordinates;
};

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
/**
 * Validate submitted attributes match category schema
 * SIMPLIFIED: Only validates unknown attributes, allows flexibility for optional fields
 */
const validateAttributes = (
  submittedAttrs: Record<string, any>,
  categoryAttrs: Array<{ fieldName: string; fieldType: string; required?: boolean; options?: string[] }>
) => {
  // If no attributes provided, that's OK
  if (!submittedAttrs || Object.keys(submittedAttrs).length === 0) {
    return;
  }

  // Build set of allowed field names from category
  const allowedFieldNames = new Set(categoryAttrs.map(a => a.fieldName));
  
  // Check for unknown attributes (attributes submitted that category doesn't define)
  for (const key of Object.keys(submittedAttrs)) {
    if (!allowedFieldNames.has(key)) {
      throw new AppError(
        `Unknown attribute: "${key}". Category only allows: ${Array.from(allowedFieldNames).join(", ")}`,
        400
      );
    }
  }

  // Validate select field options if they exist
  for (const attr of categoryAttrs) {
    const value = submittedAttrs[attr.fieldName];
    
    // Skip if not provided
    if (value === undefined || value === null || value === "") {
      continue;
    }

    // Validate select fields have allowed options
    if (attr.fieldType === "select" && attr.options && attr.options.length > 0) {
      if (!attr.options.includes(String(value))) {
        throw new AppError(
          `Attribute "${attr.fieldName}" value "${value}" is not allowed. Must be one of: ${attr.options.join(", ")}`,
          400
        );
      }
    }
  }
};

/**
 * Normalize flexible location payload into required GeoJSON Point format.
 * Accepts:
 * - GeoJSON object: { type: "Point", coordinates: [lng, lat] }
 * - Lat/lng object: { lat, lng }
 * - Coordinates array: [lng, lat]
 */
const normalizeLocation = (
  input: { city: string; address?: string; coordinates?: unknown },
  fallback?: { coordinates?: { type?: string; coordinates?: unknown } }
): NormalizedLocation => {
  const location: Partial<NormalizedLocation> = {
    city: input.city,
  };

  if (input.address !== undefined) {
    location.address = input.address;
  }

  const toTuple = (value: unknown): [number, number] | null => {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return [lng, lat];
  };

  const rawCoords = input.coordinates;
  let normalizedCoords: [number, number] | null = null;

  if (Array.isArray(rawCoords)) {
    normalizedCoords = toTuple(rawCoords);
  } else if (rawCoords && typeof rawCoords === "object") {
    const geo = rawCoords as { type?: unknown; coordinates?: unknown; lat?: unknown; lng?: unknown };

    if (geo.type === "Point" && geo.coordinates !== undefined) {
      normalizedCoords = toTuple(geo.coordinates);
    } else if (geo.lat !== undefined || geo.lng !== undefined) {
      const lat = Number(geo.lat);
      const lng = Number(geo.lng);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        normalizedCoords = [lng, lat];
      }
    }
  }

  if (!normalizedCoords && fallback?.coordinates?.type === "Point") {
    normalizedCoords = toTuple(fallback.coordinates.coordinates);
  }

  if (!normalizedCoords) {
    throw new AppError(
      "location.coordinates must be provided as [lng, lat], { lat, lng }, or GeoJSON { type: 'Point', coordinates: [lng, lat] }",
      400
    );
  }

  location.coordinates = {
    type: "Point",
    coordinates: normalizedCoords,
  };

  return location as NormalizedLocation;
};

/**
 * Create a new product listing
 */
export const createListing = async (userId: string, data: CreateListingInput) => {
  // 1. Validate category exists
  const category = await validateCategory(data.categoryId);
  
  // 2. Validate attributes against category schema
  validateAttributes(data.attributes || {}, category.attributes);
  
  // 3. Normalize location into required GeoJSON structure.
  const location = normalizeLocation(data.location);
  
  // 4. Create listing with proper references
  const listing = await ProductListing.create({
    ownerId: new Types.ObjectId(userId),
    type: "PRODUCT",
    transactionMode: data.transactionMode,
    title: data.title,
    description: data.description,
    categoryId: new Types.ObjectId(data.categoryId),
    attributes: data.attributes || {},
    price: data.price,
    currency: data.currency || "LKR",
    isNegotiable: data.transactionMode === "NEGOTIABLE" ? true : (data.isNegotiable ?? false),
    condition: data.condition || "USED_GOOD",
    images: data.images || [],
    location: location,
    status: "ACTIVE",
    tags: data.tags || []
  });
  
  // 5. Populate references before returning
  await listing.populate([
    { path: "categoryId", select: "name type" },
    { path: "ownerId", select: "name email phone" }
  ]);
  
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
    .select("+viewedByUserIds")
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

  if (requesterId) {
    const hasViewed = listing.viewedByUserIds.some((viewerId) => viewerId.toString() === requesterId);

    if (!hasViewed) {
      listing.viewedByUserIds.push(new Types.ObjectId(requesterId));
      listing.viewsCount += 1;
      await listing.save();
    }
  } else {
    listing.viewsCount += 1;
    await listing.save();
  }
  
  const sanitizedListing = listing.toObject();
  delete (sanitizedListing as { viewedByUserIds?: Types.ObjectId[] }).viewedByUserIds;

  return sanitizedListing;
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
  if (data.location) {
    const existingLocation = listing.location as unknown as {
      coordinates?: { type?: string; coordinates?: unknown };
    };
    listing.location = normalizeLocation(data.location, existingLocation) as any;
  }
  if (data.status) listing.status = data.status;
  if (data.tags) listing.tags = data.tags;
  
  // Auto-transition suspended listings to under review when user edits them
  if (listing.status === "SUSPENDED" && userRole !== "admin") {
    listing.status = "UNDER_REVIEW";
    listing.suspendDeadline = undefined;
  }
  
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

/**
 * Get all listings for a specific owner
 */
export const getMyListings = async (userId: string) => {
  return ProductListing.find({ ownerId: new Types.ObjectId(userId), status: { $ne: "DELETED" } })
    .populate("categoryId", "name type")
    .sort({ createdAt: -1 });
};
