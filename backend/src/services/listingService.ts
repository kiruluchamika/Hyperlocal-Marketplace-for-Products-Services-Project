import mongoose, { FilterQuery } from "mongoose";
import Listing, { IListing } from "../models/Listing";
import { AppError } from "../utils/AppError";

interface ListListingsQuery {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: "NEW" | "USED_LIKE_NEW" | "USED_GOOD" | "USED_FAIR";
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page: number;
  limit: number;
  sort: "recent" | "priceAsc" | "priceDesc";
}

interface ListListingsResult {
  data: IListing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const createListing = async (payload: Partial<IListing>, ownerId: string) => {
  return Listing.create({
    ...payload,
    ownerId,
    type: "PRODUCT"
  });
};

export const listListings = async (query: ListListingsQuery): Promise<ListListingsResult> => {
  const filter: FilterQuery<IListing> = {
    status: "ACTIVE",
    type: "PRODUCT"
  };

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.categoryId) {
    filter.categoryId = query.categoryId;
  }

  if (query.condition) {
    filter.condition = query.condition;
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) {
      filter.price.$gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      filter.price.$lte = query.maxPrice;
    }
  }

  if (query.lat !== undefined && query.lng !== undefined && query.radiusKm !== undefined) {
    filter["location.coordinates"] = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [query.lng, query.lat]
        },
        $maxDistance: query.radiusKm * 1000
      }
    };
  }

  const sortMap = {
    recent: { createdAt: -1 as const },
    priceAsc: { price: 1 as const },
    priceDesc: { price: -1 as const }
  };

  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    Listing.find(filter).sort(sortMap[query.sort]).skip(skip).limit(query.limit),
    Listing.countDocuments(filter)
  ]);

  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getListingById = async (listingId: string) => {
  const listing = await Listing.findById(listingId);
  if (!listing || listing.status === "DELETED") {
    throw new AppError("Listing not found", 404);
  }

  if (listing.status === "ACTIVE") {
    listing.viewsCount += 1;
    await listing.save();
  }

  return listing;
};

export const getListingForOwnershipCheck = async (listingId: string) => {
  const listing = await Listing.findById(listingId);
  if (!listing || listing.status === "DELETED") {
    throw new AppError("Listing not found", 404);
  }
  return listing;
};

export const updateListing = async (listingId: string, payload: Partial<IListing>) => {
  const listing = await Listing.findById(listingId);
  if (!listing || listing.status === "DELETED") {
    throw new AppError("Listing not found", 404);
  }

  Object.assign(listing, payload);
  await listing.save();

  return listing;
};

export const softDeleteListing = async (listingId: string) => {
  const listing = await Listing.findById(listingId);
  if (!listing || listing.status === "DELETED") {
    throw new AppError("Listing not found", 404);
  }

  listing.status = "DELETED";
  await listing.save();

  return listing;
};

export const canModifyListing = async (listingId: string, userId: string, role: string) => {
  if (role === "admin") {
    return true;
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return false;
  }

  const listing = await getListingForOwnershipCheck(listingId);
  return listing.ownerId.toString() === userId;
};
