/**
 * Notification Controller
 * 
 * Handles HTTP requests for notification endpoints
 * Uses asyncHandler to automatically catch errors
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import * as notificationService from "../services/notificationService";

/**
 * GET /api/notifications
 * List notifications for the authenticated user
 * 
 * Query params:
 * - unreadOnly: boolean (default: false)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 */
export const listNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const unreadOnly = req.query.unreadOnly === "true";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await notificationService.listNotificationsForUser(
      req.user.id,
      req.user.role,
      unreadOnly,
      page,
      limit
    );

    res.status(200).json(result);
  }
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the authenticated user
 */
export const getUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const count = await notificationService.unreadCountForUser(
      req.user.id,
      req.user.role
    );

    res.status(200).json({ unreadCount: count });
  }
);

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
export const markNotificationRead = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = req.params;

    const notification = await notificationService.markRead(
      id,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      message: "Notification marked as read",
      notification
    });
  }
);

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user
 */
export const markAllRead = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const result = await notificationService.markAllReadForUser(
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount
    });
  }
);
