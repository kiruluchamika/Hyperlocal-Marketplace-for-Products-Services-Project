import { Router } from "express";
import * as reportController from "../controllers/reportController";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import {
  submitReportSchema,
  resolveReportSchema,
  listReportsSchema,
} from "../validators/reportSchemas";

const router = Router();

/**
 * @openapi
 * /reports:
 *   post:
 *     tags: [Reports]
 *     summary: Submit a report for a listing, service, or user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetType, targetId, reason, description]
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [LISTING, SERVICE, USER]
 *               targetId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 enum: [SPAM, FRAUD, INAPPROPRIATE_CONTENT, HARASSMENT, DUPLICATE, OTHER]
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Report submitted successfully
 *       400:
 *         description: Validation error or duplicate report in 24h
 *       404:
 *         description: Target not found
 */
router.post("/", auth, validate(submitReportSchema), reportController.submitReport);

/**
 * @openapi
 * /reports/me:
 *   get:
 *     tags: [Reports]
 *     summary: Get reports submitted by the current user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of reports submitted by user
 */
router.get("/me", auth, reportController.getUserReports);

/**
 * @openapi
 * /reports/admin/list:
 *   get:
 *     tags: [Reports]
 *     summary: Get all reports for admin review with filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [OPEN, UNDER_REVIEW, RESOLVED, REJECTED]
 *       - name: targetType
 *         in: query
 *         schema:
 *           type: string
 *           enum: [LISTING, SERVICE, USER]
 *       - name: reason
 *         in: query
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of reports with pagination
 */
router.get(
  "/admin/list",
  auth,
  requireRole(["admin"]),
  validate(listReportsSchema),
  reportController.listReportsForAdmin
);

/**
 * @openapi
 * /reports/{id}:
 *   get:
 *     tags: [Reports]
 *     summary: Get report details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report details
 *       404:
 *         description: Report not found
 */
router.get("/:id", auth, reportController.getReportDetails);

/**
 * @openapi
 * /reports/{id}/resolve:
 *   patch:
 *     tags: [Reports]
 *     summary: Resolve a report (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [RESOLVED, REJECTED]
 *               adminNotes:
 *                 type: string
 *                 maxLength: 1000
 *               actionTaken:
 *                 type: string
 *                 enum: [SUSPENDED, WARNING_SENT, NONE]
 *     responses:
 *       200:
 *         description: Report resolved successfully
 *       404:
 *         description: Report not found
 */
router.patch(
  "/:id/resolve",
  auth,
  requireRole(["admin"]),
  validate(resolveReportSchema),
  reportController.resolveReport
);

/**
 * @openapi
 * /reports/target:
 *   get:
 *     tags: [Reports]
 *     summary: Get all reports for a target (listing, service, or user)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: targetType
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           enum: [LISTING, SERVICE, USER]
 *       - name: targetId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reports for the target
 */
router.get("/target/query", auth, reportController.getReportsByTarget);

export default router;
