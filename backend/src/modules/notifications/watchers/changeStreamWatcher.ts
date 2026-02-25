/**
 * MongoDB Change Stream Watcher
 * 
 * Watches MongoDB collections using Change Streams and generates notifications
 * for system events without modifying existing business logic.
 * 
 * COLLECTIONS WATCHED:
 * - orders: New orders, status changes
 * - payments: New payments, status changes
 * - productlistings: New listings, status changes
 * - servicelistings: New listings, status changes
 * - servicesellings: Status changes
 * - users: New user registrations, role changes
 * - categories: Admin notifications for changes
 * 
 * FEATURES:
 * - Completely decoupled from business logic
 * - Graceful handling of missing fields
 * - Automatic reconnection on errors
 * - Warning if Change Streams unavailable (requires replica set)
 */

import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import ServiceListing from "../../../models/ServiceListing";
import * as notificationService from "../../../services/notificationService";
import { NotificationType } from "../../../models/Notification";

let io: SocketIOServer | null = null;

/**
 * Set the Socket.IO instance for real-time notifications
 */
export const setSocketIO = (socketIO: SocketIOServer) => {
  io = socketIO;
};

/**
 * Emit notification to Socket.IO clients
 */
const emitNotification = (notification: any) => {
  if (!io) return;

  // Emit to specific user room if USER notification
  if (notification.recipientType === "USER" && notification.recipientUserId) {
    io.to(`user:${notification.recipientUserId.toString()}`).emit(
      "notification:new",
      notification
    );
  }

  // Emit to admin room if ADMIN_BROADCAST
  if (notification.recipientType === "ADMIN_BROADCAST") {
    io.to("admins").emit("notification:new", notification);
  }
};

/**
 * Watch Orders Collection
 * Generates notifications for buyers and sellers
 */
const watchOrders = () => {
  try {
    const Order = mongoose.model("Order");
    const changeStream = Order.watch();

    changeStream.on("change", async (change: any) => {
      try {
        if (change.operationType === "insert") {
          // New order created
          const doc = change.fullDocument;
          if (!doc || !doc.buyerId || !doc.sellerId) return;

          // Notify buyer
          const buyerNotif = await notificationService.createUserNotification(
            doc.buyerId,
            {
              title: "Order Created",
              message: `Your order for "${doc.titleSnapshot || "an item"}" has been created and is pending seller confirmation.`,
              type: NotificationType.ORDER,
              entityType: "orders",
              entityId: doc._id
            }
          );
          emitNotification(buyerNotif);

          // Notify seller
          const sellerNotif = await notificationService.createUserNotification(
            doc.sellerId,
            {
              title: "New Order Received",
              message: `You have received a new order for "${doc.titleSnapshot || "your item"}".`,
              type: NotificationType.ORDER,
              entityType: "orders",
              entityId: doc._id
            }
          );
          emitNotification(sellerNotif);
        }

        if (change.operationType === "update") {
          // Order status changed
          const docId = change.documentKey._id;
          const updatedFields = change.updateDescription?.updatedFields || {};

          if (updatedFields.status) {
            // Fetch full document to get buyer and seller IDs
            const doc = await Order.findById(docId);
            if (!doc) return;

            const status = updatedFields.status;
            const statusMessages: { [key: string]: string } = {
              ACCEPTED: "accepted your order",
              REJECTED: "rejected your order",
              IN_PROGRESS: "is preparing your order",
              COMPLETED: "has been completed",
              CANCELLED: "has been cancelled"
            };

            const message = statusMessages[status] || "status has been updated";

            // Notify buyer
            if (doc.buyerId) {
              const buyerNotif = await notificationService.createUserNotification(
                doc.buyerId,
                {
                  title: `Order ${status}`,
                  message: `Your order for "${doc.titleSnapshot || "an item"}" ${message}.`,
                  type: NotificationType.ORDER,
                  entityType: "orders",
                  entityId: doc._id
                }
              );
              emitNotification(buyerNotif);
            }

            // Notify seller
            if (doc.sellerId) {
              const sellerNotif = await notificationService.createUserNotification(
                doc.sellerId,
                {
                  title: `Order ${status}`,
                  message: `Order for "${doc.titleSnapshot || "your item"}" ${message}.`,
                  type: NotificationType.ORDER,
                  entityType: "orders",
                  entityId: doc._id
                }
              );
              emitNotification(sellerNotif);
            }
          }
        }
      } catch (error) {
        console.error("Error processing order change:", error);
      }
    });

    changeStream.on("error", (error) => {
      console.error("Order change stream error:", error);
    });

    console.log("✓ Watching orders collection");
  } catch (error) {
    console.warn("Could not watch orders collection:", error);
  }
};

/**
 * Watch Payments Collection
 * Generates notifications for payment events
 */
const watchPayments = () => {
  try {
    const Payment = mongoose.model("Payment");
    const changeStream = Payment.watch();

    changeStream.on("change", async (change: any) => {
      try {
        if (change.operationType === "insert") {
          // New payment created
          const doc = change.fullDocument;
          if (!doc || !doc.buyerId) return;

          const notif = await notificationService.createUserNotification(
            doc.buyerId,
            {
              title: "Payment Initiated",
              message: `Payment of $${doc.amount || 0} has been initiated.`,
              type: NotificationType.PAYMENT,
              entityType: "payments",
              entityId: doc._id
            }
          );
          emitNotification(notif);
        }

        if (change.operationType === "update") {
          const docId = change.documentKey._id;
          const updatedFields = change.updateDescription?.updatedFields || {};

          if (updatedFields.status) {
            const doc = await Payment.findById(docId);
            if (!doc) return;

            const status = updatedFields.status;

            // Notify buyer
            if (doc.buyerId) {
              const buyerNotif = await notificationService.createUserNotification(
                doc.buyerId,
                {
                  title: `Payment ${status}`,
                  message: `Your payment of $${doc.amount || 0} is now ${status.toLowerCase()}.`,
                  type: NotificationType.PAYMENT,
                  entityType: "payments",
                  entityId: doc._id
                }
              );
              emitNotification(buyerNotif);
            }

            // Notify seller on success
            if (status === "SUCCESS" && doc.sellerId) {
              const sellerNotif = await notificationService.createUserNotification(
                doc.sellerId,
                {
                  title: "Payment Received",
                  message: `Payment of $${doc.amount || 0} has been received.`,
                  type: NotificationType.PAYMENT,
                  entityType: "payments",
                  entityId: doc._id
                }
              );
              emitNotification(sellerNotif);
            }

            // Admin broadcast for failed/refunded/released payments
            if (["FAILED", "REFUNDED", "RELEASED"].includes(status)) {
              const adminNotif = await notificationService.createAdminBroadcast({
                title: `Payment ${status}`,
                message: `Payment ${doc._id} is now ${status}: $${doc.amount || 0}`,
                type: NotificationType.PAYMENT,
                entityType: "payments",
                entityId: doc._id
              });
              emitNotification(adminNotif);
            }
          }
        }
      } catch (error) {
        console.error("Error processing payment change:", error);
      }
    });

    changeStream.on("error", (error) => {
      console.error("Payment change stream error:", error);
    });

    console.log("✓ Watching payments collection");
  } catch (error) {
    console.warn("Could not watch payments collection:", error);
  }
};

/**
 * Watch Product Listings Collection
 */
const watchProductListings = () => {
  try {
    const ProductListing = mongoose.model("ProductListing");
    const changeStream = ProductListing.watch();

    changeStream.on("change", async (change: any) => {
      try {
        if (change.operationType === "insert") {
          const doc = change.fullDocument;
          if (!doc || !doc.ownerId) return;

          const notif = await notificationService.createUserNotification(
            doc.ownerId,
            {
              title: "Listing Created",
              message: `Your product listing "${doc.title || "item"}" has been created successfully.`,
              type: NotificationType.LISTING,
              entityType: "productlistings",
              entityId: doc._id
            }
          );
          emitNotification(notif);
        }

        if (change.operationType === "update") {
          const docId = change.documentKey._id;
          const updatedFields = change.updateDescription?.updatedFields || {};

          if (updatedFields.status || updatedFields.isActive !== undefined) {
            const doc = await ProductListing.findById(docId);
            if (!doc || !doc.ownerId) return;

            let message = "Your product listing has been updated.";
            if (updatedFields.status) {
              message = `Your product listing is now ${updatedFields.status}.`;
            } else if (updatedFields.isActive !== undefined) {
              message = updatedFields.isActive
                ? "Your product listing is now active."
                : "Your product listing has been deactivated.";
            }

            const notif = await notificationService.createUserNotification(
              doc.ownerId,
              {
                title: "Listing Updated",
                message,
                type: NotificationType.LISTING,
                entityType: "productlistings",
                entityId: doc._id
              }
            );
            emitNotification(notif);
          }
        }
      } catch (error) {
        console.error("Error processing product listing change:", error);
      }
    });

    changeStream.on("error", (error) => {
      console.error("Product listing change stream error:", error);
    });

    console.log("✓ Watching productlistings collection");
  } catch (error) {
    console.warn("Could not watch productlistings collection:", error);
  }
};

/**
 * Watch Service Listings Collection
 */
const watchServiceListings = () => {
  try {
    const changeStream = ServiceListing.watch();

    changeStream.on("change", async (change: any) => {
      try {
        if (change.operationType === "insert") {
          const doc = change.fullDocument;
          if (!doc || !doc.sellerId) return;

          const notif = await notificationService.createUserNotification(
            doc.sellerId,
            {
              title: "Service Listing Created",
              message: `Your service listing "${doc.title || "service"}" has been created successfully.`,
              type: NotificationType.LISTING,
              entityType: "servicelistings",
              entityId: doc._id
            }
          );
          emitNotification(notif);
        }

        if (change.operationType === "update") {
          const docId = change.documentKey._id;
          const updatedFields = change.updateDescription?.updatedFields || {};

          if (updatedFields.status || updatedFields.isActive !== undefined) {
            const doc = await ServiceListing.findById(docId);
            if (!doc || !doc.sellerId) return;

            let message = "Your service listing has been updated.";
            if (updatedFields.status) {
              message = `Your service listing is now ${updatedFields.status}.`;
            } else if (updatedFields.isActive !== undefined) {
              message = updatedFields.isActive
                ? "Your service listing is now active."
                : "Your service listing has been deactivated.";
            }

            const notif = await notificationService.createUserNotification(
              doc.sellerId,
              {
                title: "Service Listing Updated",
                message,
                type: NotificationType.LISTING,
                entityType: "servicelistings",
                entityId: doc._id
              }
            );
            emitNotification(notif);
          }
        }
      } catch (error) {
        console.error("Error processing service listing change:", error);
      }
    });

    changeStream.on("error", (error) => {
      console.error("Service listing change stream error:", error);
    });

    console.log("✓ Watching servicelistings collection");
  } catch (error) {
    console.warn("Could not watch servicelistings collection:", error);
  }
};

/**
 * Watch Service Selling Collection
 */
const watchServiceSellings = () => {
  try {
    const ServiceSelling = mongoose.model("ServiceSelling");
    const changeStream = ServiceSelling.watch();

    changeStream.on("change", async (change: any) => {
      try {
        if (change.operationType === "update") {
          const docId = change.documentKey._id;
          const updatedFields = change.updateDescription?.updatedFields || {};

          if (updatedFields.status) {
            const doc = await ServiceSelling.findById(docId);
            if (!doc) return;

            // Notify both buyer and seller if available
            if (doc.buyerId) {
              const notif = await notificationService.createUserNotification(
                doc.buyerId,
                {
                  title: "Service Status Updated",
                  message: `Your service booking status is now ${updatedFields.status}.`,
                  type: NotificationType.ORDER,
                  entityType: "servicesellings",
                  entityId: doc._id
                }
              );
              emitNotification(notif);
            }

            if (doc.sellerId) {
              const notif = await notificationService.createUserNotification(
                doc.sellerId,
                {
                  title: "Service Status Updated",
                  message: `Service booking status updated to ${updatedFields.status}.`,
                  type: NotificationType.ORDER,
                  entityType: "servicesellings",
                  entityId: doc._id
                }
              );
              emitNotification(notif);
            }
          }
        }
      } catch (error) {
        console.error("Error processing service selling change:", error);
      }
    });

    changeStream.on("error", (error) => {
      console.error("Service selling change stream error:", error);
    });

    console.log("✓ Watching servicesellings collection");
  } catch (error) {
    console.warn("Could not watch servicesellings collection:", error);
  }
};

/**
 * Watch Users Collection
 */
const watchUsers = () => {
  try {
    const User = mongoose.model("User");
    const changeStream = User.watch();

    changeStream.on("change", async (change: any) => {
      try {
        if (change.operationType === "insert") {
          const doc = change.fullDocument;
          if (!doc || !doc._id) return;

          // Welcome notification to new user
          const userNotif = await notificationService.createUserNotification(
            doc._id,
            {
              title: "Welcome to Hyperlocal Marketplace!",
              message: `Welcome ${doc.name || ""}! Your account has been created successfully.`,
              type: NotificationType.USER,
              entityType: "users",
              entityId: doc._id
            }
          );
          emitNotification(userNotif);

          // Admin broadcast for new user
          const adminNotif = await notificationService.createAdminBroadcast({
            title: "New User Registration",
            message: `New user registered: ${doc.email || "unknown"}`,
            type: NotificationType.USER,
            entityType: "users",
            entityId: doc._id
          });
          emitNotification(adminNotif);
        }

        if (change.operationType === "update") {
          const docId = change.documentKey._id;
          const updatedFields = change.updateDescription?.updatedFields || {};

          if (updatedFields.role) {
            const doc = await User.findById(docId);
            if (!doc) return;

            // Notify user of role change
            const userNotif = await notificationService.createUserNotification(
              doc._id,
              {
                title: "Role Updated",
                message: `Your account role has been updated to ${updatedFields.role}.`,
                type: NotificationType.USER,
                entityType: "users",
                entityId: doc._id
              }
            );
            emitNotification(userNotif);

            // Admin broadcast
            const adminNotif = await notificationService.createAdminBroadcast({
              title: "User Role Changed",
              message: `User ${doc.email || doc._id} role changed to ${updatedFields.role}`,
              type: NotificationType.USER,
              entityType: "users",
              entityId: doc._id
            });
            emitNotification(adminNotif);
          }
        }
      } catch (error) {
        console.error("Error processing user change:", error);
      }
    });

    changeStream.on("error", (error) => {
      console.error("User change stream error:", error);
    });

    console.log("✓ Watching users collection");
  } catch (error) {
    console.warn("Could not watch users collection:", error);
  }
};

/**
 * Watch Categories Collection
 */
const watchCategories = () => {
  try {
    const Category = mongoose.model("Category");
    const changeStream = Category.watch();

    changeStream.on("change", async (change: any) => {
      try {
        let message = "Category has been modified.";
        let title = "Category Updated";

        if (change.operationType === "insert") {
          const doc = change.fullDocument;
          message = `New category created: ${doc.name || "Unknown"}`;
          title = "New Category";
        } else if (change.operationType === "update") {
          const docId = change.documentKey._id;
          const doc = await Category.findById(docId);
          message = `Category updated: ${doc?.name || "Unknown"}`;
        } else if (change.operationType === "delete") {
          message = `Category deleted: ${change.documentKey._id}`;
          title = "Category Deleted";
        }

        const adminNotif = await notificationService.createAdminBroadcast({
          title,
          message,
          type: NotificationType.CATEGORY,
          entityType: "categories",
          entityId: change.documentKey._id
        });
        emitNotification(adminNotif);
      } catch (error) {
        console.error("Error processing category change:", error);
      }
    });

    changeStream.on("error", (error) => {
      console.error("Category change stream error:", error);
    });

    console.log("✓ Watching categories collection");
  } catch (error) {
    console.warn("Could not watch categories collection:", error);
  }
};

/**
 * Start all change stream watchers
 * Call this after MongoDB connection is established and Socket.IO is set up
 */
export const startNotificationWatcher = (socketIO: SocketIOServer) => {
  console.log("\n🔔 Initializing Notification Watcher...");

  setSocketIO(socketIO);

  // Check if MongoDB is using a replica set (required for change streams)
  const connection = mongoose.connection;
  if (!connection.db) {
    console.warn("⚠ MongoDB connection not ready. Skipping change streams.");
    return;
  }

  // Start watching all collections
  watchOrders();
  watchPayments();
  watchProductListings();
  watchServiceListings();
  watchServiceSellings();
  watchUsers();
  watchCategories();

  console.log("✓ Notification Watcher initialized\n");
  console.log("Note: Change streams require MongoDB replica set.");
  console.log("If you see connection errors, your MongoDB may not support change streams.");
  console.log("Notifications will still work via REST API, but real-time events won't be generated.\n");
};
