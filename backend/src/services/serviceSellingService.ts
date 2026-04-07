import mongoose, { Types } from "mongoose";
import Category from "../models/Category";
import ServiceSelling from "../models/ServiceSelling";
import { AppError } from "../utils/AppError";

type Role = "admin" | "user";

const deriveServiceVisibility = (service: any) => {
  if (service.deletedAt || service.status === "DELETED") {
    return { status: "DELETED" as const, isActive: false };
  }

  if (service.removedAt || service.removedReason || service.status === "REMOVED" || service.isActive === false) {
    return { status: "REMOVED" as const, isActive: false };
  }

  return { status: "ACTIVE" as const, isActive: true };
};

const normalizeServiceSelling = (service: any) => {
  const normalized = deriveServiceVisibility(service);
  const raw = typeof service?.toObject === "function" ? service.toObject() : service;

  return {
    ...raw,
    status: normalized.status,
    isActive: normalized.isActive,
  };
};

const isFilled = (v: unknown) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
};

const getValidCategory = async (categoryId: string) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new AppError("Invalid categoryId", 400);
  }

  const category = await Category.findById(categoryId);
  if (!category) throw new AppError("Category not found", 404);

  if (category.type !== "SERVICE") {
    throw new AppError("Selected category is not SERVICE type", 400);
  }

  if (!category.isActive) {
    throw new AppError("Selected category is inactive", 400);
  }

  return category;
};

const validateAttributes = (attributeValues: Record<string, unknown>, category: any) => {
  const allowed = new Set(category.attributes.map((a: any) => a.fieldName));
  const required = category.attributes
    .filter((a: any) => a.required)
    .map((a: any) => a.fieldName);

  for (const key of Object.keys(attributeValues || {})) {
    if (!allowed.has(key)) {
      throw new AppError(`Unknown attribute: ${key}`, 400);
    }
  }

  for (const key of required) {
    if (!isFilled((attributeValues || {})[key])) {
      throw new AppError(`Missing required attribute: ${key}`, 400);
    }
  }
};

const buildLocationData = (location?: {
  city?: string;
  address?: string;
  coordinates?: { coordinates?: [number, number] };
}) => {
  if (!location?.city) {
    return undefined;
  }

  return {
    city: location.city,
    address: location.address,
    ...(location.coordinates?.coordinates?.length === 2
      ? {
          coordinates: {
            type: "Point" as const,
            coordinates: location.coordinates.coordinates,
          },
        }
      : {}),
  };
};

export const createServiceSelling = async (userId: string, payload: any) => {
  const category = await getValidCategory(payload.categoryId);

  const attributeValues = payload.attributeValues || {};
  validateAttributes(attributeValues, category);

  const created = await ServiceSelling.create({
    ...payload,
    description: payload.description || "",
    location: buildLocationData(payload.location),
    attributeValues,
    sellerId: new Types.ObjectId(userId),
    status: "ACTIVE",
    isActive: true,
  });

  return created;
};

export const listServiceSelling = async (query: any) => {
  const filter: any = {
    status: "ACTIVE",
    isActive: { $ne: false },
    deletedAt: { $exists: false },
    removedAt: { $exists: false },
  };

  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.pricingType) filter.pricingType = query.pricingType;

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { locationText: { $regex: query.search, $options: "i" } },
    ];
  }

  const services = await ServiceSelling.find(filter)
    .select("-description")
    .sort({ createdAt: -1 })
    .populate("categoryId", "name type");

  return services.map(normalizeServiceSelling);
};

export const listMyServiceSelling = async (userId: string) => {
  const services = await ServiceSelling.find({ sellerId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .populate("categoryId", "name type");

  return services.map(normalizeServiceSelling);
};

export const listAdminServiceSelling = async (query: any) => {
  const filter: any = {};

  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.pricingType) filter.pricingType = query.pricingType;

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { locationText: { $regex: query.search, $options: "i" } },
    ];
  }

  const services = await ServiceSelling.find(filter)
    .sort({ createdAt: -1 })
    .populate("categoryId", "name type");

  const normalizedServices = services.map(normalizeServiceSelling);

  if (!query.status) {
    return normalizedServices;
  }

  return normalizedServices.filter((service) => service.status === query.status);
};

export const getServiceSellingById = async (
  id: string,
  requesterId?: string,
  requesterRole?: Role
) => {
  const doc = await ServiceSelling.findById(id).populate("categoryId", "name type");
  if (!doc) throw new AppError("Service ad not found", 404);

  const isOwner = requesterId && doc.sellerId.toString() === requesterId;
  const isAdmin = requesterRole === "admin";
  const normalized = deriveServiceVisibility(doc);
  const isActive = normalized.status === "ACTIVE";

  if (!isActive && !isOwner && !isAdmin) {
    throw new AppError("Service ad not found", 404);
  }

  return normalizeServiceSelling(doc);
};

export const updateServiceSelling = async (id: string, userId: string, payload: any) => {
  const existing = await ServiceSelling.findById(id);
  if (!existing) throw new AppError("Service ad not found", 404);

  if (existing.sellerId.toString() !== userId) {
    throw new AppError("Forbidden", 403);
  }

  if (deriveServiceVisibility(existing).status !== "ACTIVE") {
    throw new AppError("Cannot update a removed/deleted ad", 400);
  }

  const categoryId = payload.categoryId || existing.categoryId.toString();
  const category = await getValidCategory(categoryId);

  const attributeValues = payload.attributeValues || {};
  validateAttributes(attributeValues, category);

  const updateData: any = {
    ...payload,
    attributeValues,
  };

  if ("description" in payload) {
    updateData.description = payload.description || "";
  }

  if (payload.location?.city) {
    updateData.location = buildLocationData(payload.location);
  }

  const updated = await ServiceSelling.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  ).populate("categoryId", "name type");

  return updated;
};

export const deleteServiceSelling = async (id: string, userId: string) => {
  const existing = await ServiceSelling.findById(id);
  if (!existing) throw new AppError("Service ad not found", 404);

  if (existing.sellerId.toString() !== userId) {
    throw new AppError("Forbidden", 403);
  }

  existing.status = "DELETED";
  existing.isActive = false;
  existing.deletedAt = new Date();
  await existing.save();

  return { message: "Service ad deleted successfully" };
};

export const moderateRemoveServiceSelling = async (
  id: string,
  adminId: string,
  reason: string
) => {
  const existing = await ServiceSelling.findById(id);
  if (!existing) throw new AppError("Service ad not found", 404);

  if (deriveServiceVisibility(existing).status === "DELETED") {
    throw new AppError("Cannot moderate a deleted ad", 400);
  }

  existing.status = "REMOVED";
  existing.isActive = false;
  existing.removedReason = reason;
  existing.removedBy = new Types.ObjectId(adminId);
  existing.removedAt = new Date();

  await existing.save();

  return { message: "Service ad removed by admin", data: existing };
};

export const canModifyServiceSelling = async (id: string, userId: string, _role: Role) => {
  const doc = await ServiceSelling.findById(id);
  if (!doc) return false;
  return doc.sellerId.toString() === userId;
};
