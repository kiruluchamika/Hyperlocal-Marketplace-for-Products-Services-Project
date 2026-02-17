"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canModifyListing = exports.softDeleteListing = exports.updateListing = exports.getListingForOwnershipCheck = exports.getListingById = exports.listListings = exports.createListing = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Listing_1 = __importDefault(require("../models/Listing"));
const AppError_1 = require("../utils/AppError");
const createListing = async (payload, ownerId) => {
    return Listing_1.default.create({
        ...payload,
        ownerId,
        type: "PRODUCT"
    });
};
exports.createListing = createListing;
const listListings = async (query) => {
    const filter = {
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
        recent: { createdAt: -1 },
        priceAsc: { price: 1 },
        priceDesc: { price: -1 }
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
        Listing_1.default.find(filter).sort(sortMap[query.sort]).skip(skip).limit(query.limit),
        Listing_1.default.countDocuments(filter)
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
exports.listListings = listListings;
const getListingById = async (listingId) => {
    const listing = await Listing_1.default.findById(listingId);
    if (!listing || listing.status === "DELETED") {
        throw new AppError_1.AppError("Listing not found", 404);
    }
    if (listing.status === "ACTIVE") {
        listing.viewsCount += 1;
        await listing.save();
    }
    return listing;
};
exports.getListingById = getListingById;
const getListingForOwnershipCheck = async (listingId) => {
    const listing = await Listing_1.default.findById(listingId);
    if (!listing || listing.status === "DELETED") {
        throw new AppError_1.AppError("Listing not found", 404);
    }
    return listing;
};
exports.getListingForOwnershipCheck = getListingForOwnershipCheck;
const updateListing = async (listingId, payload) => {
    const listing = await Listing_1.default.findById(listingId);
    if (!listing || listing.status === "DELETED") {
        throw new AppError_1.AppError("Listing not found", 404);
    }
    Object.assign(listing, payload);
    await listing.save();
    return listing;
};
exports.updateListing = updateListing;
const softDeleteListing = async (listingId) => {
    const listing = await Listing_1.default.findById(listingId);
    if (!listing || listing.status === "DELETED") {
        throw new AppError_1.AppError("Listing not found", 404);
    }
    listing.status = "DELETED";
    await listing.save();
    return listing;
};
exports.softDeleteListing = softDeleteListing;
const canModifyListing = async (listingId, userId, role) => {
    if (role === "admin") {
        return true;
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        return false;
    }
    const listing = await (0, exports.getListingForOwnershipCheck)(listingId);
    return listing.ownerId.toString() === userId;
};
exports.canModifyListing = canModifyListing;
