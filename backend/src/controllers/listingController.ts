import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createListing,
  getListingById,
  listListings,
  softDeleteListing,
  updateListing
} from "../services/listingService";
import { AppError } from "../utils/AppError";

const toListingResponse = (listing: any) => ({
  _id: listing.id ?? listing._id,
  ownerId: listing.ownerId,
  type: listing.type,
  transactionMode: listing.transactionMode,
  title: listing.title,
  price: listing.price,
  isActive: listing.status === "ACTIVE",
  isAvailable: listing.status === "ACTIVE",
  description: listing.description,
  categoryId: listing.categoryId,
  category: listing.category ?? null,
  attributes: listing.attributes ?? {},
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

export const createListingHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const listing = await createListing(req.body, req.user.id);

  res.status(201).json(toListingResponse(listing));
});

export const listListingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listListings(req.query as any);

  res.status(200).json({
    data: result.data.map(toListingResponse),
    pagination: result.pagination
  });
});

export const getListingByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const listing = await getListingById(req.params.id, req.user);
  res.status(200).json(toListingResponse(listing));
});

export const updateListingHandler = asyncHandler(async (req: Request, res: Response) => {
  const listing = await updateListing(req.params.id, req.body);
  res.status(200).json(toListingResponse(listing));
});

export const deleteListingHandler = asyncHandler(async (req: Request, res: Response) => {
  const listing = await softDeleteListing(req.params.id);
  res.status(200).json({
    message: "Listing deleted successfully",
    listing: toListingResponse(listing)
  });
});
