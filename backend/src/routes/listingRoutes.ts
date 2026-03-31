import { Router } from "express";
import { auth } from "../middlewares/auth";
import { authOptional } from "../middlewares/authOptional";
import { validate } from "../middlewares/validate";
import { requireOwnershipOrAdmin } from "../middlewares/requireOwnershipOrAdmin";
import {
  createListingHandler,
  deleteListingHandler,
  getListingByIdHandler,
  listListingsHandler,
  updateListingHandler,
  getMyListingsHandler
} from "../controllers/listingController";
import {
  createListingSchema,
  listingIdParamSchema,
  listListingsQuerySchema,
  updateListingSchema
} from "../validators/listingSchemas";

const router = Router();

/**
 * @openapi
 * /listings:
 *   post:
 *     tags: [Listings]
 *     summary: Create a product listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [PRODUCT]
 *               transactionMode:
 *                 type: string
 *                 enum: [BUY_NOW, NEGOTIABLE]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               attributes:
 *                 type: object
 *                 additionalProperties:
 *                   oneOf:
 *                     - type: string
 *                     - type: number
 *                     - type: boolean
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *                 example: LKR
 *               isNegotiable:
 *                 type: boolean
 *               condition:
 *                 type: string
 *                 enum: [NEW, USED_LIKE_NEW, USED_GOOD, USED_FAIR]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                   address:
 *                     type: string
 *                   coordinates:
*                     type: object
*                     properties:
*                       type:
*                         type: string
*                         enum: [Point]
*                       coordinates:
*                         type: array
*                         minItems: 2
*                         maxItems: 2
*                         items:
*                           type: number
*                     required: [type, coordinates]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *             required: [title, description, categoryId, price, condition, images, location]
 *     responses:
 *       201:
 *         description: Listing created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post("/", auth, validate(createListingSchema), createListingHandler);

/**
 * @openapi
 * /listings:
 *   get:
 *     tags: [Listings]
 *     summary: Public product listings feed
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: transactionMode
 *         schema:
 *           type: string
 *           enum: [BUY_NOW, NEGOTIABLE]
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *           enum: [NEW, USED_LIKE_NEW, USED_GOOD, USED_FAIR]
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, priceAsc, priceDesc]
 *     responses:
 *       200:
 *         description: Listings feed
 */
router.get("/", validate(listListingsQuerySchema, "query"), listListingsHandler);

/**
 * @openapi
 * /listings/me:
 *   get:
 *     tags: [Listings]
 *     summary: Get all listings for the authenticated user (including suspended/review)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's listings
 */
router.get("/me", auth, getMyListingsHandler);

/**
 * @openapi
 * /listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Get single listing by id (public active; owner/admin can access non-active)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Listing details
 *       404:
 *         description: Listing not found
 */
router.get("/:id", authOptional, validate(listingIdParamSchema, "params"), getListingByIdHandler);

/**
 * @openapi
 * /listings/{id}:
 *   put:
 *     tags: [Listings]
 *     summary: Update listing (owner or admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactionMode:
 *                 type: string
 *                 enum: [BUY_NOW, NEGOTIABLE]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               attributes:
 *                 type: object
 *                 additionalProperties:
 *                   oneOf:
 *                     - type: string
 *                     - type: number
 *                     - type: boolean
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *                 example: LKR
 *               isNegotiable:
 *                 type: boolean
 *               condition:
 *                 type: string
 *                 enum: [NEW, USED_LIKE_NEW, USED_GOOD, USED_FAIR]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                   address:
 *                     type: string
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [Point]
 *                       coordinates:
 *                         type: array
 *                         minItems: 2
 *                         maxItems: 2
 *                         items:
 *                           type: number
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SOLD, HIDDEN]
 *     responses:
 *       200:
 *         description: Listing updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Listing not found
 */
router.put(
  "/:id",
  auth,
  validate(listingIdParamSchema, "params"),
  requireOwnershipOrAdmin,
  validate(updateListingSchema),
  updateListingHandler
);

/**
 * @openapi
 * /listings/{id}:
 *   delete:
 *     tags: [Listings]
 *     summary: Soft delete listing (owner or admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Listing soft deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Listing not found
 */
router.delete(
  "/:id",
  auth,
  validate(listingIdParamSchema, "params"),
  requireOwnershipOrAdmin,
  deleteListingHandler
);

export default router;
