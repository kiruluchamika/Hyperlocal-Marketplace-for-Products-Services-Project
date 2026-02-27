/**
 * Geospatial Controller
 * 
 * Handles HTTP requests for geospatial search endpoints
 * Uses geoService for location-based queries
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as geoService from "../services/geoService";

/**
 * @route GET /geo-search/search
 * @desc Search for nearby products and services within specified radius
 * @access Public
 */
export const searchNearbyHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { latitude, longitude, radiusKm } = req.query;

    const result = await geoService.searchNearby(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      parseFloat(radiusKm as string)
    );

    res.status(200).json(result);
  }
);

/**
 * @route GET /geo-search/search-with-filters
 * @desc Search for nearby products and services with optional filters
 * @access Public
 */
export const searchNearbyWithFiltersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      latitude,
      longitude,
      radiusKm,
      minPrice,
      maxPrice,
      type,
      categoryId
    } = req.query;

    const result = await geoService.searchNearbyWithFilters(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      parseFloat(radiusKm as string),
      {
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        type: (type as "PRODUCT" | "SERVICE" | undefined),
        categoryId: categoryId as string | undefined
      }
    );

    res.status(200).json(result);
  }
);
