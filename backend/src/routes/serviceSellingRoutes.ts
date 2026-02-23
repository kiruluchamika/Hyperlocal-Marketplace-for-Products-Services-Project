import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import { requireServiceSellingOwnershipOrAdmin } from "../middlewares/requireServiceSellingOwnershipOrAdmin";

import {
  createServiceSellingSchema,
  updateServiceSellingSchema,
  listServiceSellingQuerySchema,
} from "../validators/serviceSellingSchemas";

import * as svc from "../services/serviceSellingService";

const router = Router();

/**
 * @openapi
 * /serviceselling:
 *   get:
 *     tags: [ServiceSelling]
 *     summary: Public service ads feed
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
 *         name: pricingType
 *         schema:
 *           type: string
 *           enum: [FIXED, HOURLY]
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Service ads feed
 */
router.get(
  "/",
  validate(listServiceSellingQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const result = await svc.listServiceSelling(req.query);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /serviceselling/{id}:
 *   get:
 *     tags: [ServiceSelling]
 *     summary: Get single service ad by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service ad details
 *       404:
 *         description: Not found
 */
router.get("/:id", async (req, res, next) => {
  try {
    const item = await svc.getServiceSellingById(req.params.id);
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /serviceselling:
 *   post:
 *     tags: [ServiceSelling]
 *     summary: Create a service ad (seller only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - categoryId
 *               - price
 *               - pricingType
 *               - locationText
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               price:
 *                 type: number
 *                 example: 1500
 *               pricingType:
 *                 type: string
 *                 enum: [FIXED, HOURLY]
 *               locationText:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               attributeValues:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       201:
 *         description: Service ad created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post(
  "/",
  auth,
  requireRole(["seller"]),
  validate(createServiceSellingSchema),
  async (req: any, res, next) => {
    try {
      const created = await svc.createServiceSelling(req.user.id, req.body);
      res.status(201).json({ success: true, data: created });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /serviceselling/{id}:
 *   put:
 *     tags: [ServiceSelling]
 *     summary: Update service ad (owner or admin)
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
 *         description: Service ad updated
 *       403:
 *         description: Forbidden
 */
router.put(
  "/:id",
  auth,
  requireRole(["seller"]),
  requireServiceSellingOwnershipOrAdmin,
  validate(updateServiceSellingSchema),
  async (req: any, res, next) => {
    try {
      const updated = await svc.updateServiceSelling(
        req.params.id,
        req.user.id,
        req.body
      );
      res.json({ success: true, data: updated });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /serviceselling/{id}:
 *   delete:
 *     tags: [ServiceSelling]
 *     summary: Delete service ad (owner or admin)
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
 *         description: Service ad deleted
 *       403:
 *         description: Forbidden
 */
router.delete(
  "/:id",
  auth,
  requireRole(["seller"]),
  requireServiceSellingOwnershipOrAdmin,
  async (req: any, res, next) => {
    try {
      await svc.deleteServiceSelling(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
