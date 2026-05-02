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

export type NotificationView = "user" | "admin" | "all";

const DUPLICATE_NOTIFICATION_WINDOW_MS = 2 * 60 * 1000;

const normalizeRole = (role: string) =>
  role?.toLowerCase() === "admin" ? "admin" : "user";

const normalizeEntityId = (value: unknown) => {
  if (!value) return "";

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  return String(value);
};

const notificationFingerprint = (notification: {
  recipientType: RecipientType;
  recipientUserId?: unknown;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: unknown;
}) =>
  [
    notification.recipientType,
    normalizeEntityId(notification.recipientUserId),
    notification.title,
    notification.message,
    notification.type,
    notification.entityType || "",
    normalizeEntityId(notification.entityId)
  ].join("|");

const dedupeNotifications = <T extends {
  recipientType: RecipientType;
  recipientUserId?: unknown;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: unknown;
}>(notifications: T[]) => {
  const seen = new Set<string>();
  return notifications.filter((notification) => {
    const key = notificationFingerprint(notification);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const recentDuplicateQuery = (
  payload: CreateNotificationPayload,
  recipient: {
    recipientType: RecipientType;
    recipientUserId?: string | mongoose.Types.ObjectId;
  }
) => ({
  recipientType: recipient.recipientType,
  ...(recipient.recipientUserId
    ? { recipientUserId: new mongoose.Types.ObjectId(recipient.recipientUserId.toString()) }
    : {}),
  title: payload.title,
  message: payload.message,
  type: payload.type,
  entityType: payload.entityType,
  entityId: payload.entityId,
  createdAt: { $gte: new Date(Date.now() - DUPLICATE_NOTIFICATION_WINDOW_MS) }
});

const buildAccessQuery = (
  userId: string,
  role: string,
  view: NotificationView = "all"
) => {
  const normalizedRole = normalizeRole(role);
  const userFilter = {
    recipientType: RecipientType.USER,
    recipientUserId: new mongoose.Types.ObjectId(userId)
  };

  if (normalizedRole !== "admin") {
    return userFilter;
  }

  if (view === "admin") {
    return {
      recipientType: RecipientType.ADMIN_BROADCAST
    };
  }

  if (view === "user") {
    return userFilter;
  }

  return {
    $or: [
      userFilter,
      {
        recipientType: RecipientType.ADMIN_BROADCAST
      }
    ]
  };
};

/**
 * Create a user-specific notification
 * @param userId - The recipient user ID
 * @param payload - Notification content
 */
export const createUserNotification = async (
  userId: string | mongoose.Types.ObjectId,
  payload: CreateNotificationPayload
) => {
  const recentDuplicate = await Notification.findOne(
    recentDuplicateQuery(payload, {
      recipientType: RecipientType.USER,
      recipientUserId: userId
    })
  );

  if (recentDuplicate) {
    return recentDuplicate;
  }

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
  const recentDuplicate = await Notification.findOne(
    recentDuplicateQuery(payload, {
      recipientType: RecipientType.ADMIN_BROADCAST
    })
  );

  if (recentDuplicate) {
    return recentDuplicate;
  }

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
  view: NotificationView = "all",
  unreadOnly: boolean = false,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  const query: any = buildAccessQuery(userId, role, view);

  // Filter for unread only if requested
  if (unreadOnly) {
    query.isRead = false;
  }

  const allNotifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .lean();
  const dedupedNotifications = dedupeNotifications(allNotifications);
  const notifications = dedupedNotifications.slice(skip, skip + limit);
  const total = dedupedNotifications.length;

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
  role: string,
  view: NotificationView = "all"
) => {
  const accessQuery = buildAccessQuery(userId, role, view);
  const notification = await Notification.findOne({
    _id: notificationId,
    ...accessQuery
  });

  if (!notification) {
    const notificationExists = await Notification.exists({ _id: notificationId });
    if (!notificationExists) {
      throw new AppError("Notification not found", 404);
    }

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
export const markAllReadForUser = async (
  userId: string,
  role: string,
  view: NotificationView = "all"
) => {
  const query: any = {
    isRead: false,
    ...buildAccessQuery(userId, role, view)
  };

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
export const unreadCountForUser = async (
  userId: string,
  role: string,
  view: NotificationView = "all"
) => {
  const query: any = {
    isRead: false,
    ...buildAccessQuery(userId, role, view)
  };

  const notifications = await Notification.find(query).sort({ createdAt: -1 }).lean();
  const count = dedupeNotifications(notifications).length;

  return count;
};
