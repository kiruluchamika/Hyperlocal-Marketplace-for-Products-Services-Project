/**
 * Socket.IO Setup for Real-Time Notifications
 * 
 * Handles WebSocket connections with JWT authentication
 * Manages user-specific and admin broadcast rooms
 * 
 * AUTHENTICATION:
 * Clients must provide JWT token in handshake query: ?token=<jwt>
 * 
 * ROOMS:
 * - user:<userId> - Individual user notifications
 * - admins - Admin broadcast notifications
 * 
 * EVENTS:
 * - notification:new - Emitted when new notification is created
 */

import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env";

interface JwtPayload {
  sub: string;
  role: string;
}

/**
 * Setup Socket.IO server with authentication and room management
 * 
 * @param server - HTTP server instance
 * @returns Configured Socket.IO server
 */
export const setupNotificationSocket = (server: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Configure based on your frontend URL in production
      methods: ["GET", "POST"]
    },
    path: "/socket.io/"
  });

  // Authentication middleware
  io.use((socket: Socket, next: (err?: Error) => void) => {
    try {
      // Extract token from query parameters
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const payload = jwt.verify(token as string, env.JWT_SECRET) as JwtPayload;

      // Attach user info to socket data
      socket.data.userId = payload.sub;
      socket.data.userRole = payload.role;

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Invalid or expired token"));
    }
  });

  // Connection handler
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;
    const userRole = socket.data.userRole;

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`✓ Socket connected: User ${userId} (${userRole})`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join admin room if user is admin
    if (userRole === "admin") {
      socket.join("admins");
      console.log(`✓ User ${userId} joined admin room`);
    }

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`✗ Socket disconnected: User ${userId}`);
    });

    // Optional: Handle client acknowledgment
    socket.on("notification:acknowledged", (notificationId: string) => {
      console.log(`Notification ${notificationId} acknowledged by user ${userId}`);
    });
  });

  console.log("✓ Socket.IO server initialized");

  return io;
};
