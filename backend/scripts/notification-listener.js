/**
 * Notification Listener Test Script
 * 
 * This script connects to the Socket.IO server and listens for real-time notifications.
 * 
 * USAGE:
 * 
 * 1. Get JWT Token:
 *    - Open Swagger UI: http://localhost:5000/api-docs
 *    - Go to Auth > POST /auth/login
 *    - Login with your credentials
 *    - Copy the JWT token from the response
 * 
 * 2. Run this script:
 *    node scripts/notification-listener.js YOUR_JWT_TOKEN_HERE
 * 
 * 3. Test notifications:
 *    - In Swagger, create orders, update payments, create listings, etc.
 *    - Watch this terminal for real-time notification events
 *    - Also check Swagger GET /notifications to see persisted notifications
 * 
 * EXAMPLE:
 * node scripts/notification-listener.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

const { io } = require("socket.io-client");

// Configuration
const SERVER_URL = "http://localhost:5000";
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error("❌ Error: JWT token is required");
  console.log("\nUsage:");
  console.log("  node scripts/notification-listener.js YOUR_JWT_TOKEN");
  console.log("\nHow to get token:");
  console.log("  1. Open http://localhost:5000/api-docs");
  console.log("  2. Login via POST /auth/login");
  console.log("  3. Copy the JWT token from response");
  console.log("  4. Run this script with the token\n");
  process.exit(1);
}

console.log("🔌 Connecting to notification server...");
console.log(`   Server: ${SERVER_URL}`);
console.log(`   Token: ${TOKEN.substring(0, 20)}...\n`);

// Create socket connection with JWT token
const socket = io(SERVER_URL, {
  auth: {
    token: TOKEN
  },
  query: {
    token: TOKEN
  }
});

// Connection successful
socket.on("connect", () => {
  console.log("✅ Connected to notification server!");
  console.log(`   Socket ID: ${socket.id}`);
  console.log("\n👂 Listening for notifications...");
  console.log("   (Press Ctrl+C to stop)\n");
  console.log("─".repeat(60));
});

// Listen for new notifications
socket.on("notification:new", (notification) => {
  const timestamp = new Date().toLocaleTimeString();
  
  console.log("\n🔔 NEW NOTIFICATION");
  console.log(`   Time: ${timestamp}`);
  console.log(`   Type: ${notification.type}`);
  console.log(`   Title: ${notification.title}`);
  console.log(`   Message: ${notification.message}`);
  if (notification.entityType && notification.entityId) {
    console.log(`   Related: ${notification.entityType}/${notification.entityId}`);
  }
  console.log(`   ID: ${notification._id}`);
  console.log("─".repeat(60));
  
  // Optional: Send acknowledgment
  socket.emit("notification:acknowledged", notification._id);
});

// Connection error
socket.on("connect_error", (error) => {
  console.error("\n❌ Connection Error:", error.message);
  console.log("\nPossible issues:");
  console.log("  - Invalid or expired JWT token");
  console.log("  - Server is not running");
  console.log("  - Wrong server URL\n");
  process.exit(1);
});

// Disconnection
socket.on("disconnect", (reason) => {
  console.log(`\n❌ Disconnected: ${reason}`);
  if (reason === "io server disconnect") {
    console.log("   Server disconnected the socket. Check your token validity.");
  }
});

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n\n👋 Closing connection...");
  socket.close();
  process.exit(0);
});
