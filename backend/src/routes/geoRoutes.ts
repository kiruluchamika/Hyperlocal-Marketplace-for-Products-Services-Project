/**
 * Geospatial Routes
 * 
 * API endpoints for geospatial search functionality
 * All endpoints are public (no authentication required)
 */

import { Router } from "express";
import { validate } from "../middlewares/validate";
import {
  searchNearbyHandler,
  searchNearbyWithFiltersHandler
} from "../controllers/geoController";
import {
  nearbySearchQuerySchema,
  nearbySearchWithFiltersSchema
} from "../validators/geoSchemas";

const router = Router();

/**
 * @openapi
 * /geo-search/search:
 *   get:
 *     tags: [Geospatial]
 *     summary: Search for nearby products and services
 *     description: Find all active products and services within a specified radius from given coordinates (Latitude, Longitude). Results include both products and services sorted by distance.
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           example: 6.9271
 *         description: Latitude coordinate (-90 to 90 degrees)
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           example: 80.7744
 *         description: Longitude coordinate (-180 to 180 degrees)
 *       - in: query
 *         name: radiusKm
 *         required: true
 *         schema:
 *           type: number
 *           example: 5
 *           minimum: 0.1
 *           maximum: 100
 *         description: Search radius in kilometers (0.1 to 100 km)
 *     responses:
 *       '200':
 *         description: Successfully retrieved nearby products and services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [PRODUCT]
 *                           title:
 *                             type: string
 *                           price:
 *                             type: number
 *                           distance:
 *                             type: number
 *                             description: Distance in km from center point
 *                           condition:
 *                             type: string
 *                           city:
 *                             type: string
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [SERVICE]
 *                           title:
 *                             type: string
 *                           price:
 *                             type: number
 *                           distance:
 *                             type: number
 *                             description: Distance in km from center point
 *                           pricingType:
 *                             type: string
 *                             enum: [FIXED, HOURLY]
 *                 total:
 *                   type: number
 *                   description: Total count of products and services found
 *                 query:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     radiusKm:
 *                       type: number
 *       '400':
 *         description: Invalid coordinates or radius
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid latitude. Must be between -90 and 90"
 *       '500':
 *         description: Server error during geospatial search
 */
router.get(
  "/search",
  validate(nearbySearchQuerySchema, "query"),
  searchNearbyHandler
);

/**
 * @openapi
 * /geo-search/search-with-filters:
 *   get:
 *     tags: [Geospatial]
 *     summary: Search for nearby products and services with optional filters
 *     description: Find products and services within a specified radius with optional price range and type filters
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           example: 6.9271
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           example: 80.7744
 *       - in: query
 *         name: radiusKm
 *         required: true
 *         schema:
 *           type: number
 *           example: 5
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           example: 1000
 *         description: Minimum price filter (optional)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           example: 50000
 *         description: Maximum price filter (optional)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PRODUCT, SERVICE]
 *         description: Filter by type (optional). Omit for both types
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by category ID (optional)
 *     responses:
 *       '200':
 *         description: Successfully retrieved filtered results
 *       '400':
 *         description: Invalid input parameters
 *       '500':
 *         description: Server error
 */
router.get(
  "/search-with-filters",
  validate(nearbySearchWithFiltersSchema, "query"),
  searchNearbyWithFiltersHandler
);

export default router;
