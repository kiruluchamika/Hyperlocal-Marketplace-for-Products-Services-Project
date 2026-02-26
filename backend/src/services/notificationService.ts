/**
 * Notification Service
 * 
 * Handles all business logic for notifications:
 * - Creating user-specific and admin broadcast notifications
 * - Retrieving notifications with security rules
 * - Marking notifications as read
 * - Counting unread notifications
 * 
 * SECURITY:
 * - Regular users only see their own USER notifications
 * - Admins see their own USER notifications + all ADMIN_BROADCAST notifications
 * - All queries enforce these rules at the database level
 */

import mongoose from "mongoose";
import Notification, { RecipientType, NotificationType } from "../models/Notification";
import { AppError } from "../utils/AppError";

export interface CreateNotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId | string;
}

/**
 * Create a user-specific notification
 * @param userId - The recipient user ID
 * @param payload - Notification content
 */
export const createUserNotification = async (
  userId: string | mongoose.Types.ObjectId,
  payload: CreateNotificationPayload
) => {
  const notification = await Notification.create({
    recipientType: RecipientType.USER,
    recipientUserId: new mongoose.Types.ObjectId(userId.toString()),
    title: payload.title,
    message: payload.message,
    type: payload.type,
    entityType: payload.entityType,
    entityId: payload.entityId,
    isRead: false
  });

  return notification;
};

/**
 * Create an admin broadcast notification
 * All admins will see this notification
 * @param payload - Notification content
 */
export const createAdminBroadcast = async (payload: CreateNotificationPayload) => {
  const notification = await Notification.create({
    recipientType: RecipientType.ADMIN_BROADCAST,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    entityType: payload.entityType,
    entityId: payload.entityId,
    isRead: false
  });

  return notification;
};

/**
 * List notifications for a specific user
 * Regular users: see their own USER notifications
 * Admins: see their own USER notifications + all ADMIN_BROADCAST notifications
 * 
 * @param userId - The user ID
 * @param role - User role ("user" or "admin")
 * @param unreadOnly - Filter for unread notifications only
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 */
export const listNotificationsForUser = async (
  userId: string,
  role: string,
  unreadOnly: boolean = false,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  // Build query based on role
  const query: any = {
    $or: [
      {
        recipientType: RecipientType.USER,
        recipientUserId: new mongoose.Types.ObjectId(userId)
      }
    ]
  };

  // Admins also see broadcast notifications
  if (role === "admin") {
    query.$or.push({
      recipientType: RecipientType.ADMIN_BROADCAST
    });
  }

  // Filter for unread only if requested
  if (unreadOnly) {
    query.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query)
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Mark a specific notification as read
 * Enforces ownership - users can only mark their own notifications
 * 
 * @param notificationId - The notification ID
 * @param userId - The user ID
 * @param role - User role
 */
export const markRead = async (
  notificationId: string,
  userId: string,
  role: string
) => {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  // Security check: ensure user has access to this notification
  const hasAccess =
    (notification.recipientType === RecipientType.USER &&
      notification.recipientUserId?.toString() === userId) ||
    (notification.recipientType === RecipientType.ADMIN_BROADCAST &&
      role === "admin");

  if (!hasAccess) {
    throw new AppError("Not authorized to access this notification", 403);
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};

/**
 * Mark all notifications as read for a user
 * 
 * @param userId - The user ID
 * @param role - User role
 */
export const markAllReadForUser = async (userId: string, role: string) => {
  const query: any = {
    isRead: false,
    $or: [
      {
        recipientType: RecipientType.USER,
        recipientUserId: new mongoose.Types.ObjectId(userId)
      }
    ]
  };

  // Admins also mark broadcast notifications as read
  if (role === "admin") {
    query.$or.push({
      recipientType: RecipientType.ADMIN_BROADCAST
    });
  }

  const result = await Notification.updateMany(query, {
    $set: { isRead: true }
  });

  return {
    modifiedCount: result.modifiedCount
  };
};

/**
 * Get unread notification count for a user
 * 
 * @param userId - The user ID
 * @param role - User role
 */
export const unreadCountForUser = async (userId: string, role: string) => {
  const query: any = {
    isRead: false,
    $or: [
      {
        recipientType: RecipientType.USER,
        recipientUserId: new mongoose.Types.ObjectId(userId)
      }
    ]
  };

  // Admins also count broadcast notifications
  if (role === "admin") {
    query.$or.push({
      recipientType: RecipientType.ADMIN_BROADCAST
    });
  }

  const count = await Notification.countDocuments(query);

  return count;
};
