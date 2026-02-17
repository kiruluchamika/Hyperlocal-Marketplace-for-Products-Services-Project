"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const requireOwnershipOrAdmin_1 = require("../middlewares/requireOwnershipOrAdmin");
const listingController_1 = require("../controllers/listingController");
const listingSchemas_1 = require("../validators/listingSchemas");
const router = (0, express_1.Router)();
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
 *                     type: array
 *                     minItems: 2
 *                     maxItems: 2
 *                     items:
 *                       type: number
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
router.post("/", auth_1.auth, (0, validate_1.validate)(listingSchemas_1.createListingSchema), listingController_1.createListingHandler);
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
router.get("/", (0, validate_1.validate)(listingSchemas_1.listListingsQuerySchema, "query"), listingController_1.listListingsHandler);
/**
 * @openapi
 * /listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Get single listing by id
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
router.get("/:id", (0, validate_1.validate)(listingSchemas_1.listingIdParamSchema, "params"), listingController_1.getListingByIdHandler);
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
 *     responses:
 *       200:
 *         description: Listing updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Listing not found
 */
router.put("/:id", auth_1.auth, (0, validate_1.validate)(listingSchemas_1.listingIdParamSchema, "params"), requireOwnershipOrAdmin_1.requireOwnershipOrAdmin, (0, validate_1.validate)(listingSchemas_1.updateListingSchema), listingController_1.updateListingHandler);
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
router.delete("/:id", auth_1.auth, (0, validate_1.validate)(listingSchemas_1.listingIdParamSchema, "params"), requireOwnershipOrAdmin_1.requireOwnershipOrAdmin, listingController_1.deleteListingHandler);
exports.default = router;
