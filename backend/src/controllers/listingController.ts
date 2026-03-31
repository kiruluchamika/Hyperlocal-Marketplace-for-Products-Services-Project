/**
 * Listing Controller
 * 
 * Handles HTTP requests for product listing endpoints.
 * Uses listingService for business logic.
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as listingService from "../services/listingService";

/**
 * @route POST /listings
 * @desc Create a new product listing
 * @access Private (any authenticated user)
 */
export const createListingHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const listing = await listingService.createListing(userId, req.body);
  
  res.status(201).json({
    success: true,
    data: listing
  });
});

/**
 * @route GET /listings
 * @desc Get all active product listings with filters
 * @access Public
 */
export const listListingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const searchTerm = (req.query.searchTerm as string) || (req.query.search as string);

  const query = {
    categoryId: req.query.categoryId as string,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    city: req.query.city as string,
    condition: req.query.condition as string,
    transactionMode: req.query.transactionMode as string,
    searchTerm,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined
  };
  
  const result = await listingService.getListings(query);
  
  res.status(200).json({
    success: true,
    data: result.listings,
    pagination: result.pagination
  });
});

/**
 * @route GET /listings/:id
 * @desc Get single listing by ID
 * @access Public (but only active listings visible to non-owners)
 */
export const getListingByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const listingId = req.params.id;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;
  
  const listing = await listingService.getListingById(listingId, requesterId, requesterRole);
  
  res.status(200).json({
    success: true,
    data: listing
  });
});

/**
 * @route PUT /listings/:id
 * @desc Update a listing
 * @access Private (owner or admin)
 */
export const updateListingHandler = asyncHandler(async (req: Request, res: Response) => {
  const listingId = req.params.id;
  const userId = req.user!.id;
  const userRole = req.user!.role;
  
  const listing = await listingService.updateListing(listingId, userId, userRole, req.body);
  
  res.status(200).json({
    success: true,
    data: listing,
    message: "Listing updated successfully"
  });
});

/**
 * @route DELETE /listings/:id
 * @desc Delete a listing (soft delete)
 * @access Private (owner or admin)
 */
export const deleteListingHandler = asyncHandler(async (req: Request, res: Response) => {
  const listingId = req.params.id;
  const userId = req.user!.id;
  const userRole = req.user!.role;
  
  const result = await listingService.deleteListing(listingId, userId, userRole);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

/**
 * @route GET /listings/me
 * @desc Get all listings for the authenticated user
 * @access Private
 */
export const getMyListingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const data = await listingService.getMyListings(userId);
  
  res.status(200).json({
    success: true,
    data,
    pagination: { total: data.length, page: 1, limit: data.length, totalPages: 1 }
  });
});
