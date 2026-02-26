/**
 * Notification Routes
 * 
 * Defines all notification endpoints with OpenAPI/Swagger documentation
 * 
 * @openapi
 * tags:
 *   name: Notifications
 *   description: Real-time notification management for orders, payments, and system events
 */

import { Router } from "express";
import { auth } from "../middlewares/auth";
import * as notificationController from "../controllers/notificationController";

const router = Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for authenticated user
 *     description: |
 *       Retrieves paginated list of notifications for the current user.
 *       Regular users see only their personal notifications.
 *       Admins see their personal notifications + admin broadcasts.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Filter to show only unread notifications
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (1-indexed)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", auth, notificationController.listNotifications);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     description: Returns the count of unread notifications for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/unread-count", auth, notificationController.getUnreadCount);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     description: Marks a specific notification as read. Users can only mark their own notifications.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification marked as read
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized to access this notification
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/:id/read", auth, notificationController.markNotificationRead);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications as read for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: All notifications marked as read
 *                 modifiedCount:
 *                   type: integer
 *                   example: 10
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/read-all", auth, notificationController.markAllRead);

/**
 * @openapi
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Notification ID
 *         recipientType:
 *           type: string
 *           enum: [USER, ADMIN_BROADCAST]
 *           description: Type of recipient
 *         recipientUserId:
 *           type: string
 *           description: User ID (for USER type only)
 *         title:
 *           type: string
 *           description: Notification title
 *           maxLength: 200
 *         message:
 *           type: string
 *           description: Notification message
 *           maxLength: 1000
 *         type:
 *           type: string
 *           enum: [ORDER, PAYMENT, LISTING, USER, CATEGORY, SYSTEM]
 *           description: Notification category
 *         entityType:
 *           type: string
 *           description: Related entity type (e.g., "orders", "payments")
 *         entityId:
 *           type: string
 *           description: Related entity ID
 *         isRead:
 *           type: boolean
 *           description: Whether notification has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         _id: 507f1f77bcf86cd799439011
 *         recipientType: USER
 *         recipientUserId: 507f191e810c19729de860ea
 *         title: New Order Received
 *         message: You have received a new order for "Laptop Dell XPS 13"
 *         type: ORDER
 *         entityType: orders
 *         entityId: 507f1f77bcf86cd799439012
 *         isRead: false
 *         createdAt: 2026-02-25T10:30:00.000Z
 *         updatedAt: 2026-02-25T10:30:00.000Z
 */

export default router;
