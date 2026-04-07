import { Router } from "express";
import { auth } from "../middlewares/auth";
import { authOptional } from "../middlewares/authOptional";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import { requireServiceSellingOwnershipOrAdmin } from "../middlewares/requireServiceSellingOwnershipOrAdmin";

import {
  createServiceSellingSchema,
  updateServiceSellingSchema,
  listServiceSellingQuerySchema,
} from "../validators/serviceSellingSchemas";

import * as svc from "../services/serviceSellingService";
import { AppError } from "../utils/AppError";

const router = Router();

/**
 * @openapi
 * /serviceselling:
 *   get:
 *     tags: [ServiceSelling]
 *     summary: Public service ads feed (ACTIVE only)
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
router.get("/", validate(listServiceSellingQuerySchema, "query"), async (req, res, next) => {
  try {
    const result = await svc.listServiceSelling(req.query);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /serviceselling/me:
 *   get:
 *     tags: [ServiceSelling]
 *     summary: Get my service ads (all statuses)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My service ads
 *       401:
 *         description: Authentication required
 */
router.get("/me", auth, async (req: any, res, next) => {
  try {
    const result = await svc.listMyServiceSelling(req.user.id);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /serviceselling/admin:
 *   get:
 *     tags: [ServiceSelling]
 *     summary: Admin view of all service ads (all statuses)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, REMOVED, DELETED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All service ads for admin dashboard
 *       403:
 *         description: Forbidden
 */
router.get("/admin", auth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const result = await svc.listAdminServiceSelling(req.query);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /serviceselling/{id}:
 *   get:
 *     tags: [ServiceSelling]
 *     summary: Get single service ad by id (ACTIVE for public, REMOVED/DELETED only for owner/admin)
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
 *         description: Service ad details
 *       404:
 *         description: Not found
 *       401:
 *         description: Authentication required
 */
router.get("/:id", authOptional, async (req: any, res, next) => {
  try {
    const item = await svc.getServiceSellingById(
      req.params.id,
      req.user?.id,
      req.user?.role
    );
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
 *     summary: Create a service ad (user only)
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
  requireRole(["user"]),
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
 *     summary: Update service ad (owner only)
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               price:
 *                 type: number
 *               pricingType:
 *                 type: string
 *                 enum: [FIXED, HOURLY]
 *               locationText:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               attributeValues:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Service ad updated
 *       403:
 *         description: Forbidden
 */
router.put(
  "/:id",
  auth,
  requireRole(["user"]),
  requireServiceSellingOwnershipOrAdmin,
  validate(updateServiceSellingSchema),
  async (req: any, res, next) => {
    try {
      const updated = await svc.updateServiceSelling(req.params.id, req.user.id, req.body);
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
 *     summary: Delete service ad (owner only) - soft delete
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
  requireRole(["user"]),
  requireServiceSellingOwnershipOrAdmin,
  async (req: any, res, next) => {
    try {
      const result = await svc.deleteServiceSelling(req.params.id, req.user.id);
      res.json({ success: true, message: result.message });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /serviceselling/{id}/moderate:
 *   patch:
 *     tags: [ServiceSelling]
 *     summary: Admin removes a service ad (soft remove with reason)
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
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Violates terms and conditions"
 *     responses:
 *       200:
 *         description: Service ad removed by admin
 *       403:
 *         description: Forbidden
 */
router.patch(
  "/:id/moderate",
  auth,
  requireRole(["admin"]),
  async (req: any, res, next) => {
    try {
      const reason = String(req.body?.reason || "").trim();
      if (!reason) throw new AppError("Reason is required", 400);

      const result = await svc.moderateRemoveServiceSelling(req.params.id, req.user.id, reason);
      res.json({ success: true, message: result.message, data: result.data });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
