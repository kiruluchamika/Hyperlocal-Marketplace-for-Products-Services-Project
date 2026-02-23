import mongoose, { FilterQuery } from "mongoose";
import ProductListing, { IProductListing } from "../models/ProductListing";
import Category, { ICategory } from "../models/Category";
import { AppError } from "../utils/AppError";

type AttributeValue = string | number | boolean;

interface RequesterContext {
  id: string;
  role: string;
}

interface ListListingsQuery {
  search?: string;
  categoryId?: string;
  transactionMode?: "BUY_NOW" | "NEGOTIABLE";
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
  data: Array<Record<string, unknown>>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreateListingInput {
  transactionMode: "BUY_NOW" | "NEGOTIABLE";
  title: string;
  description: string;
  categoryId: string;
  attributes?: Record<string, AttributeValue>;
  price: number;
  currency?: string;
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
  attributes?: Record<string, AttributeValue>;
  price?: number;
  currency?: string;
  isNegotiable?: boolean;
  condition?: "NEW" | "USED_LIKE_NEW" | "USED_GOOD" | "USED_FAIR";
  images?: string[];
  location?: {
    city?: string;
    address?: string;
    coordinates?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  tags?: string[];
  status?: "ACTIVE" | "SOLD" | "HIDDEN";
}

const normalizeAttributes = (attributes: unknown): Record<string, AttributeValue> => {
  if (!attributes) {
    return {};
  }

  if (attributes instanceof Map) {
    return Object.fromEntries(attributes.entries()) as Record<string, AttributeValue>;
  }

  if (typeof attributes !== "object" || Array.isArray(attributes)) {
    throw new AppError("attributes must be an object", 400);
  }

  return attributes as Record<string, AttributeValue>;
};

const ensureProductCategory = async (categoryId: string): Promise<ICategory> => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new AppError("Invalid categoryId", 400);
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (category.type !== "PRODUCT") {
    throw new AppError("Category must be a PRODUCT category", 400);
  }

  if (!category.isActive) {
    throw new AppError("Selected category is inactive", 400);
  }

  return category;
};

const validateAttributeValueType = (
  key: string,
  value: AttributeValue,
  attributeRule: ICategory["attributes"][number]
) => {
  if (attributeRule.fieldType === "string" && typeof value !== "string") {
    throw new AppError(`Attribute '${key}' must be a string`, 400);
  }

  if (attributeRule.fieldType === "number" && typeof value !== "number") {
    throw new AppError(`Attribute '${key}' must be a number`, 400);
  }

  if (attributeRule.fieldType === "boolean" && typeof value !== "boolean") {
    throw new AppError(`Attribute '${key}' must be a boolean`, 400);
  }

  if (attributeRule.fieldType === "select") {
    if (typeof value !== "string") {
      throw new AppError(`Attribute '${key}' must be a string`, 400);
    }

    const options = attributeRule.options ?? [];
    if (options.length > 0 && !options.includes(value)) {
      throw new AppError(`Attribute '${key}' must be one of: ${options.join(", ")}`, 400);
    }
  }
};

const validateSubmittedAttributes = (category: ICategory, submitted: Record<string, AttributeValue>) => {
  const rulesByName = new Map(category.attributes.map((attribute) => [attribute.fieldName, attribute]));

  for (const [key, value] of Object.entries(submitted)) {
    const rule = rulesByName.get(key);
    if (!rule) {
      throw new AppError(`Unknown attribute '${key}' for category '${category.name}'`, 400);
    }

    validateAttributeValueType(key, value, rule);
  }
};

const enforceRequiredAttributes = (category: ICategory, attributes: Record<string, AttributeValue>) => {
  for (const attributeRule of category.attributes) {
    if (!attributeRule.required) {
      continue;
    }

    const value = attributes[attributeRule.fieldName];
    if (value === undefined || value === null) {
      throw new AppError(`Missing required attribute '${attributeRule.fieldName}'`, 400);
    }

    if (attributeRule.fieldType === "string" && typeof value === "string" && value.trim().length === 0) {
      throw new AppError(`Attribute '${attributeRule.fieldName}' cannot be empty`, 400);
    }
  }
};

const pruneToCategoryAttributes = (category: ICategory, attributes: Record<string, AttributeValue>) => {
  const allowed = new Set(category.attributes.map((attribute) => attribute.fieldName));
  return Object.fromEntries(Object.entries(attributes).filter(([key]) => allowed.has(key)));
};

const attachCategoryDetails = async (listings: IProductListing[]) => {
  const categoryIds = [...new Set(listings.map((listing) => listing.categoryId.toString()))];

  const categories = await Category.find({ _id: { $in: categoryIds } }).select("_id name type isActive");
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return listings.map((listing) => {
    const listingObject = listing.toObject();
    const category = categoryMap.get(listing.categoryId.toString());

    return {
      ...listingObject,
      category: category
        ? {
            _id: category.id,
            name: category.name,
            type: category.type,
            isActive: category.isActive
          }
        : null
    };
  });
};

export const createListing = async (payload: CreateListingInput, ownerId: string) => {
  const category = await ensureProductCategory(payload.categoryId);
  const submittedAttributes = normalizeAttributes(payload.attributes);

  validateSubmittedAttributes(category, submittedAttributes);
  enforceRequiredAttributes(category, submittedAttributes);

  return ProductListing.create({
    ...payload,
    ownerId,
    categoryId: category._id,
    type: "PRODUCT",
    currency: "LKR",
    attributes: submittedAttributes
  });
};

export const listListings = async (query: ListListingsQuery): Promise<ListListingsResult> => {
  const filter: FilterQuery<IProductListing> = {
    status: "ACTIVE",
    type: "PRODUCT"
  };

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.categoryId) {
    filter.categoryId = query.categoryId;
  }

  if (query.transactionMode) {
    filter.transactionMode = query.transactionMode;
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
    ProductListing.find(filter).sort(sortMap[query.sort]).skip(skip).limit(query.limit),
    ProductListing.countDocuments(filter)
  ]);

  const dataWithCategory = await attachCategoryDetails(data);

  return {
    data: dataWithCategory,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getListingById = async (listingId: string, requester?: RequesterContext) => {
  const listing = await ProductListing.findById(listingId);
  if (!listing || listing.status === "DELETED") {
    throw new AppError("Listing not found", 404);
  }

  const isOwner = requester ? listing.ownerId.toString() === requester.id : false;
  const isAdmin = requester?.role === "admin";

  if (listing.status !== "ACTIVE" && !isOwner && !isAdmin) {
    throw new AppError("Listing not found", 404);
  }

  if (listing.status === "ACTIVE") {
    listing.viewsCount += 1;
    await listing.save();
  }

  const [listingWithCategory] = await attachCategoryDetails([listing]);
  return listingWithCategory;
};

export const getListingForOwnershipCheck = async (listingId: string) => {
  const listing = await ProductListing.findById(listingId);
  if (!listing || listing.status === "DELETED") {
    throw new AppError("Listing not found", 404);
  }
  return listing;
};

export const updateListing = async (listingId: string, payload: UpdateListingInput) => {
  const listing = await ProductListing.findById(listingId);
  if (!listing || listing.status === "DELETED") {
    throw new AppError("Listing not found", 404);
  }

  const targetCategoryId = payload.categoryId ?? listing.categoryId.toString();
  const category = await ensureProductCategory(targetCategoryId);

  const existingAttributes = normalizeAttributes(listing.attributes);
  const submittedAttributes = payload.attributes ? normalizeAttributes(payload.attributes) : undefined;

  if (submittedAttributes) {
    validateSubmittedAttributes(category, submittedAttributes);
  }

  const mergedAttributes = {
    ...existingAttributes,
    ...(submittedAttributes ?? {})
  };

  const prunedAttributes = pruneToCategoryAttributes(category, mergedAttributes);
  enforceRequiredAttributes(category, prunedAttributes);

  const { attributes, categoryId, ...updatablePayload } = payload;

  Object.assign(listing, updatablePayload);
  listing.categoryId = category._id;
  listing.currency = "LKR";
  listing.attributes = prunedAttributes;
  await listing.save();

  const [listingWithCategory] = await attachCategoryDetails([listing]);
  return listingWithCategory;
};

export const softDeleteListing = async (listingId: string) => {
  const listing = await ProductListing.findById(listingId);
  if (!listing || listing.status === "DELETED") {
    throw new AppError("Listing not found", 404);
  }

  listing.status = "DELETED";
  await listing.save();

  const [listingWithCategory] = await attachCategoryDetails([listing]);
  return listingWithCategory;
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
