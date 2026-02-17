"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteListingHandler = exports.updateListingHandler = exports.getListingByIdHandler = exports.listListingsHandler = exports.createListingHandler = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const listingService_1 = require("../services/listingService");
const AppError_1 = require("../utils/AppError");
const toListingResponse = (listing) => ({
    _id: listing.id,
    ownerId: listing.ownerId,
    type: listing.type,
    transactionMode: listing.transactionMode,
    title: listing.title,
    price: listing.price,
    isActive: listing.status === "ACTIVE",
    isAvailable: listing.status === "ACTIVE",
    description: listing.description,
    categoryId: listing.categoryId,
    currency: listing.currency,
    isNegotiable: listing.isNegotiable,
    condition: listing.condition,
    images: listing.images,
    location: listing.location,
    status: listing.status,
    tags: listing.tags,
    viewsCount: listing.viewsCount,
    savedCount: listing.savedCount,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt
});
exports.createListingHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new AppError_1.AppError("Authentication required", 401);
    }
    const listing = await (0, listingService_1.createListing)(req.body, req.user.id);
    res.status(201).json(toListingResponse(listing));
});
exports.listListingsHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, listingService_1.listListings)(req.query);
    res.status(200).json({
        data: result.data.map(toListingResponse),
        pagination: result.pagination
    });
});
exports.getListingByIdHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const listing = await (0, listingService_1.getListingById)(req.params.id);
    res.status(200).json(toListingResponse(listing));
});
exports.updateListingHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const listing = await (0, listingService_1.updateListing)(req.params.id, req.body);
    res.status(200).json(toListingResponse(listing));
});
exports.deleteListingHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const listing = await (0, listingService_1.softDeleteListing)(req.params.id);
    res.status(200).json({
        message: "Listing deleted successfully",
        listing: toListingResponse(listing)
    });
});
